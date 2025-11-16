import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import Forum from '../components/Forum';
import '../App.css';

// Helper function to calculate area of a shape
function calculateArea(drawing) {
  if (!window.google || !window.google.maps || !window.google.maps.geometry) return null;
  
  const { type, data } = drawing;
  let area = null;
  
  if (type === 'circle' && data.radius) {
    area = Math.PI * data.radius * data.radius;
  } else if (type === 'polygon' && data.paths) {
    const path = data.paths.map(p => new window.google.maps.LatLng(p.lat, p.lng));
    area = window.google.maps.geometry.spherical.computeArea(path);
  } else if (type === 'rectangle' && data.bounds) {
    const bounds = new window.google.maps.LatLngBounds(
      { lat: data.bounds.south, lng: data.bounds.west },
      { lat: data.bounds.north, lng: data.bounds.east }
    );
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const path = [
      sw,
      new window.google.maps.LatLng(ne.lat(), sw.lng()),
      ne,
      new window.google.maps.LatLng(sw.lat(), ne.lng())
    ];
    area = window.google.maps.geometry.spherical.computeArea(path);
  }
  
  return area;
}

function Overview() {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [geocoder, setGeocoder] = useState(null);

  // Disable scrolling on mount, re-enable on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);
  const [infoWindow, setInfoWindow] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [activeTab, setActiveTab] = useState('map'); // 'map' or 'forum'
  const [comments, setComments] = useState({}); // { drawingId: [comments] }
  const [newComment, setNewComment] = useState({}); // { drawingId: text }
  const [user, setUser] = useState(null);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const mapRef = useRef(null);
  const scriptLoaded = useRef(false);
  const overlaysRef = useRef([]);
  const infoWindowRefs = useRef({}); // { drawingId: { infoWindow, root } }

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Set axios default header for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = JSON.parse(savedUser);
      setUser(userData);
    } else {
      // Clear authorization header if no token
      delete axios.defaults.headers.common['Authorization'];
    }

    // Load Google Maps API key from backend
    axios.get('/api/config')
      .then(response => {
        if (response.data.googleMapsApiKey) {
          setApiKey(response.data.googleMapsApiKey);
          setApiKeyError(null);
        } else {
          setApiKeyError('API key not found in server response');
        }
      })
      .catch(error => {
        console.error('Error fetching API key:', error);
        if (error.response && error.response.data && error.response.data.error) {
          setApiKeyError(error.response.data.message || error.response.data.error);
        } else {
          setApiKeyError('Failed to load Google Maps API key. Please check your backend configuration.');
        }
      });
  }, []);

  // Fetch drawings from backend
  useEffect(() => {
    const fetchDrawings = () => {
      axios.get('/api/drawings')
        .then(response => {
          setDrawings(response.data);
        })
        .catch(error => {
          console.error('Error fetching drawings:', error);
        });
    };

    fetchDrawings();
    // Poll for new drawings every 2 seconds
    const interval = setInterval(fetchDrawings, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch comments for all drawings
  useEffect(() => {
    const fetchComments = () => {
      // Ensure authorization header is set
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      drawings.forEach(drawing => {
        axios.get(`/api/drawings/${drawing.id}/comments`, { headers })
          .then(response => {
            setComments(prev => ({
              ...prev,
              [drawing.id]: response.data
            }));
          })
          .catch(error => {
            console.error(`Error fetching comments for drawing ${drawing.id}:`, error);
          });
      });
    };

    if (drawings.length > 0) {
      fetchComments();
      const interval = setInterval(fetchComments, 3000);
      return () => clearInterval(interval);
    }
  }, [drawings]);

  // Check if current user is admin
  const isAdmin = user && user.username === 'admin';

  // Update info window when drawing data, comments, or votes change
  useEffect(() => {
    if (selectedDrawing && infoWindowRefs.current[selectedDrawing]) {
      const ref = infoWindowRefs.current[selectedDrawing];
      const drawing = drawings.find(d => d.id === selectedDrawing);
      if (drawing && ref.root) {
        ref.root.render(
          <DrawingInfoContent
            drawing={drawing}
            allDrawings={drawings}
            comments={comments[selectedDrawing] || []}
            newComment={newComment[selectedDrawing] || ''}
            setNewComment={(text) => setNewComment(prev => ({ ...prev, [selectedDrawing]: text }))}
            user={user}
            onCommentSubmit={() => handleCommentSubmit(selectedDrawing)}
            onVote={handleVote}
            isAdmin={isAdmin}
            onClose={() => {
              ref.infoWindow.close();
              setSelectedDrawing(null);
            }}
          />
        );
      }
    }
  }, [drawings, comments, newComment, user, selectedDrawing, isAdmin]);

  // Display drawings on map when map and drawings are ready
  useEffect(() => {
    if (!map || !window.google || !infoWindow) return;

    // Clear existing overlays
    overlaysRef.current.forEach(overlay => {
      if (overlay) {
        overlay.setMap(null);
      }
    });
    overlaysRef.current = [];

    // Display all drawings
    drawings.forEach(drawingData => {
      const { type, data } = drawingData;
      let overlay = null;

      try {
        if (type === 'marker') {
          overlay = new window.google.maps.Marker({
            position: { lat: data.position.lat, lng: data.position.lng },
            map: map,
            title: 'Shared Marker',
            clickable: true
          });
        } else if (type === 'circle') {
          overlay = new window.google.maps.Circle({
            center: { lat: data.center.lat, lng: data.center.lng },
            radius: data.radius,
            map: map,
            fillColor: '#ffff00',
            fillOpacity: 0.3,
            strokeWeight: 2,
            clickable: true,
            editable: false
          });
        } else if (type === 'polygon') {
          overlay = new window.google.maps.Polygon({
            paths: data.paths.map(p => ({ lat: p.lat, lng: p.lng })),
            map: map,
            fillColor: '#ffff00',
            fillOpacity: 0.3,
            strokeWeight: 2,
            clickable: true,
            editable: false
          });
        } else if (type === 'polyline') {
          overlay = new window.google.maps.Polyline({
            path: data.path.map(p => ({ lat: p.lat, lng: p.lng })),
            map: map,
            strokeColor: '#ff0000',
            strokeWeight: 3,
            clickable: true,
            editable: false
          });
        } else if (type === 'rectangle') {
          overlay = new window.google.maps.Rectangle({
            bounds: new window.google.maps.LatLngBounds(
              { lat: data.bounds.south, lng: data.bounds.west },
              { lat: data.bounds.north, lng: data.bounds.east }
            ),
            map: map,
            fillColor: '#ffff00',
            fillOpacity: 0.3,
            strokeWeight: 2,
            clickable: true,
            editable: false
          });
        }

        // Add hover and click listeners
        if (overlay) {
          let hoverTimeout = null;
          let hoverInfoWindow = null;
          
          // Hover listener - show quick preview
          overlay.addListener('mouseover', () => {
            hoverTimeout = setTimeout(() => {
              if (!hoverInfoWindow) {
                hoverInfoWindow = new window.google.maps.InfoWindow({
                  maxWidth: 350
                });
              }
              
              const commentCount = comments[drawingData.id]?.length || 0;
              const upvotes = drawingData.upvotes || 0;
              const downvotes = drawingData.downvotes || 0;
              
              // Calculate percentages for hover
              const totalVotesHover = upvotes + downvotes;
              const upvotePct = totalVotesHover > 0 ? ((upvotes / totalVotesHover) * 100).toFixed(1) : null;
              const downvotePct = totalVotesHover > 0 ? ((downvotes / totalVotesHover) * 100).toFixed(1) : null;
              
              // Calculate area for shapes
              const area = calculateArea(drawingData);
              const areaText = area !== null 
                ? `<br><span style="color: #007bff; font-size: 11px; font-weight: 600;">Area: ${(area / 1000000).toFixed(2)} km²</span>`
                : '';
              
              let hoverContent = `
                <div style="padding: 8px; font-family: Arial, sans-serif; font-size: 13px;">
                  <strong>${drawingData.title || `Untitled ${drawingData.type}`}</strong><br>
                  <span style="color: #666; font-size: 11px;">
                    ↑ ${upvotes}${upvotePct ? ` (${upvotePct}%)` : ''} / ↓ ${downvotes}${downvotePct ? ` (${downvotePct}%)` : ''} | Comments: ${commentCount}
                  </span>${areaText}<br>
                  <span style="color: #999; font-size: 10px; font-style: italic;">
                    Click to view details, vote, and comment
                  </span>
                </div>
              `;
              
              hoverInfoWindow.setContent(hoverContent);
              
              if (type === 'marker') {
                hoverInfoWindow.open(map, overlay);
              } else {
                let position;
                if (type === 'polygon' || type === 'polyline') {
                  // Polygons and polylines don't have getBounds() or getPosition()
                  // Calculate center from path
                  const path = overlay.getPath();
                  const bounds = new window.google.maps.LatLngBounds();
                  path.forEach((latLng) => {
                    bounds.extend(latLng);
                  });
                  position = bounds.getCenter();
                } else if (overlay.getBounds) {
                  // Circle and Rectangle have getBounds()
                  position = overlay.getBounds().getCenter();
                } else {
                  // Fallback for markers (shouldn't reach here)
                  position = overlay.getPosition();
                }
                hoverInfoWindow.setPosition(position);
                hoverInfoWindow.open(map);
              }
            }, 500); // Show after 500ms hover
          });
          
          // Mouse out - close hover info
          overlay.addListener('mouseout', () => {
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              hoverTimeout = null;
            }
            if (hoverInfoWindow) {
              hoverInfoWindow.close();
            }
          });
          
          // Click listener - show full info with comments and voting
          overlay.addListener('click', () => {
            // Clear hover timeout and close hover info
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              hoverTimeout = null;
            }
            if (hoverInfoWindow) {
              hoverInfoWindow.close();
            }
            
            setSelectedDrawing(drawingData.id);
            
            // Close any existing info windows
            Object.values(infoWindowRefs.current).forEach(ref => {
              if (ref && ref.infoWindow) {
                ref.infoWindow.close();
              }
            });
            
            // Create or reuse info window for this drawing
            let drawingInfoWindow = infoWindowRefs.current[drawingData.id]?.infoWindow;
            if (!drawingInfoWindow) {
              drawingInfoWindow = new window.google.maps.InfoWindow({
                maxWidth: 600,
                pixelOffset: new window.google.maps.Size(0, -10)
              });
            }
            
            // Create a div for React to render into
            const contentDiv = document.createElement('div');
            contentDiv.id = `drawing-info-${drawingData.id}`;
            contentDiv.style.minWidth = '450px';
            contentDiv.style.maxWidth = '600px';
            contentDiv.style.maxHeight = '700px';
            contentDiv.style.overflowY = 'auto';
            
            // Create React root and render component
            const root = ReactDOM.createRoot(contentDiv);
            infoWindowRefs.current[drawingData.id] = {
              infoWindow: drawingInfoWindow,
              root: root
            };
            
            // Render the info component
            root.render(
              <DrawingInfoContent
                drawing={drawingData}
                allDrawings={drawings}
                comments={comments[drawingData.id] || []}
                newComment={newComment[drawingData.id] || ''}
                setNewComment={(text) => setNewComment(prev => ({ ...prev, [drawingData.id]: text }))}
                user={user}
                onCommentSubmit={() => handleCommentSubmit(drawingData.id)}
                onVote={handleVote}
                isAdmin={isAdmin}
                onClose={() => {
                  drawingInfoWindow.close();
                  setSelectedDrawing(null);
                }}
              />
            );
            
            drawingInfoWindow.setContent(contentDiv);
            
            if (type === 'marker') {
              drawingInfoWindow.open(map, overlay);
            } else {
              let position;
              if (type === 'polygon' || type === 'polyline') {
                // Polygons and polylines don't have getBounds() or getPosition()
                // Calculate center from path
                const path = overlay.getPath();
                const bounds = new window.google.maps.LatLngBounds();
                path.forEach((latLng) => {
                  bounds.extend(latLng);
                });
                position = bounds.getCenter();
              } else if (overlay.getBounds) {
                // Circle and Rectangle have getBounds()
                position = overlay.getBounds().getCenter();
              } else {
                // Fallback for markers (shouldn't reach here)
                position = overlay.getPosition();
              }
              drawingInfoWindow.setPosition(position);
              drawingInfoWindow.open(map);
            }
          });
          overlaysRef.current.push(overlay);
        }
      } catch (error) {
        console.error('Error displaying drawing:', error);
      }
    });

    return () => {
      overlaysRef.current.forEach(overlay => {
        if (overlay) {
          overlay.setMap(null);
        }
      });
      overlaysRef.current = [];
    };
  }, [map, drawings, infoWindow]);

  // Initialize or resize map when switching from forum to map tab
  useEffect(() => {
    if (activeTab === 'map' && apiKey && !apiKeyError && window.google && window.google.maps && mapRef.current) {
      // Use setTimeout to ensure the DOM has updated and the map container is visible
      setTimeout(() => {
        if (!map && mapRef.current) {
          // Map hasn't been initialized yet, initialize it now
          initializeMap();
        } else if (map) {
          // Map exists, just trigger resize
          window.google.maps.event.trigger(map, 'resize');
        }
      }, 100);
    }
  }, [activeTab, map, apiKey, apiKeyError]);

  useEffect(() => {
    if (!apiKey || scriptLoaded.current || apiKeyError) return;

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      scriptLoaded.current = true;
      // Initialize map if already loaded
      if (mapRef.current) {
        initializeMap();
      } else {
        setTimeout(initializeMap, 100);
      }
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Script exists, wait for it to load or use existing
      if (window.google && window.google.maps) {
        scriptLoaded.current = true;
        if (mapRef.current) {
          initializeMap();
        } else {
          setTimeout(initializeMap, 100);
        }
      } else {
        // Script exists but not loaded yet, wait for it
        existingScript.addEventListener('load', () => {
          scriptLoaded.current = true;
          if (mapRef.current) {
            initializeMap();
          } else {
            setTimeout(initializeMap, 100);
          }
        });
      }
      return;
    }

    // Load Google Maps script with geometry library to display shapes (no drawing library)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (mapRef.current) {
        initializeMap();
      } else {
        setTimeout(initializeMap, 100);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setApiKeyError('Failed to load Google Maps JavaScript API. Please check your API key and ensure it has the required APIs enabled.');
      scriptLoaded.current = false;
    };
    document.head.appendChild(script);
    scriptLoaded.current = true;
  }, [apiKey]);

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    const defaultLocation = { lat: 42.1934, lng: 24.3336 };
    
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 10,
      mapTypeId: window.google.maps.MapTypeId.SATELLITE,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    // Trigger resize to ensure map renders properly
    setTimeout(() => {
      if (window.google && window.google.maps) {
        window.google.maps.event.trigger(newMap, 'resize');
      }
    }, 100);

    const newGeocoder = new window.google.maps.Geocoder();
    const newInfoWindow = new window.google.maps.InfoWindow();
    
    const newMarker = new window.google.maps.Marker({
      position: defaultLocation,
      map: newMap,
      title: 'Default Location',
      animation: window.google.maps.Animation.DROP
    });

    newInfoWindow.setContent('Pazardzik, Bulgaria');
    newInfoWindow.open(newMap, newMarker);

    // Viewer mode: No click listener - viewers can only view, not interact with map
    // Removed map click listener for viewer mode

    setMap(newMap);
    setGeocoder(newGeocoder);
    setInfoWindow(newInfoWindow);
    setMarker(newMarker);
  };


  const placeMarkerAndPanTo = (latLng, mapInstance, markerInstance, geocoderInstance, infoWindowInstance) => {
    markerInstance.setPosition(latLng);
    mapInstance.panTo(latLng);
    
    geocoderInstance.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        infoWindowInstance.setContent(results[0].formatted_address);
        infoWindowInstance.open(mapInstance, markerInstance);
      }
    });
  };



  const resetMap = () => {
    if (!map || !marker || !infoWindow) return;

    const defaultLocation = { lat: 42.1934, lng: 24.3336 };
    map.setCenter(defaultLocation);
    map.setZoom(10);
    
    marker.setPosition(defaultLocation);
    
    infoWindow.setContent('Pazardzik, Bulgaria');
    infoWindow.open(map, marker);
  };

  const handleCommentSubmit = (drawingId) => {
    const commentText = newComment[drawingId];
    if (!commentText || !commentText.trim()) return;

    // Ensure authorization header is set
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    axios.post(`/api/drawings/${drawingId}/comments`, { content: commentText }, { headers })
      .then(response => {
        // Clear comment input
        setNewComment(prev => ({ ...prev, [drawingId]: '' }));
        // Use the comment from the response immediately, then refresh
        if (response.data.comment) {
          setComments(prev => ({
            ...prev,
            [drawingId]: [response.data.comment, ...(prev[drawingId] || [])]
          }));
        }
        // Refresh comments to get latest
        return axios.get(`/api/drawings/${drawingId}/comments`, { headers });
      })
      .then(response => {
        setComments(prev => ({
          ...prev,
          [drawingId]: response.data
        }));
      })
      .catch(error => {
        console.error('Error submitting comment:', error);
        alert('Failed to submit comment. ' + (error.response?.data?.error || 'Please try again.'));
      });
  };

  const handleVote = (drawingId, voteType) => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;

    axios.post(`/api/drawings/${drawingId}/vote/${voteType}`)
      .then(response => {
        // Update drawing with new vote state
        setDrawings(prev => prev.map(d => 
          d.id === drawingId 
            ? { 
                ...d, 
                userVote: response.data.userVote,
                upvotes: response.data.upvotes,
                downvotes: response.data.downvotes
              }
            : d
        ));
      })
      .catch(error => {
        console.error('Error voting:', error);
        alert('Failed to vote. ' + (error.response?.data?.error || 'Please try again.'));
      });
  };

  return (
    <div className="App">
      <div className="container">
        {apiKeyError && (
          <div style={{
            padding: '20px',
            margin: '20px',
            backgroundColor: '#fee',
            border: '2px solid #fcc',
            borderRadius: '8px',
            color: '#c33'
          }}>
            <h3 style={{ marginTop: 0 }}>⚠️ Google Maps API Error</h3>
            <p><strong>{apiKeyError}</strong></p>
            <p style={{ marginTop: '10px', fontSize: '0.9em' }}>
              To fix this:
              <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
                <li>Create a <code>backend/.env</code> file if it doesn't exist</li>
                <li>Add your Google Maps API key: <code>GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
                <li>Make sure your API key has these APIs enabled:
                  <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                    <li>Maps JavaScript API</li>
                    <li>Geocoding API</li>
                    <li>Places API (optional)</li>
                  </ul>
                </li>
                <li>Restart your backend server</li>
              </ol>
            </p>
          </div>
        )}
        
        {/* Tabs */}
        <div className={`tabs-container ${activeTab === 'forum' ? 'indicator-right' : ''}`}>
          <div className="tab-indicator"></div>
          <button 
            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            Map
          </button>
          <button 
            className={`tab-btn ${activeTab === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveTab('forum')}
          >
            Forum
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="map-container">
              <div ref={mapRef} id="map" className="map"></div>
            </div>
          </div>
        )}

        {activeTab === 'forum' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="forum-tab-content">
              <Forum user={user} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Drawing Info Content Component (rendered in InfoWindow)
function DrawingInfoContent({ drawing, allDrawings, comments, newComment, setNewComment, user, onCommentSubmit, onVote, isAdmin, onClose }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleUpvote = () => {
    onVote(drawing.id, 'upvote');
  };
  
  const handleDownvote = () => {
    onVote(drawing.id, 'downvote');
  };
  
  const userVote = drawing.userVote || null;
  const upvotes = drawing.upvotes || 0;
  const downvotes = drawing.downvotes || 0;
  
  // Calculate percentages
  const totalVotes = upvotes + downvotes;
  const upvotePercentage = totalVotes > 0 ? ((upvotes / totalVotes) * 100).toFixed(1) : null;
  const downvotePercentage = totalVotes > 0 ? ((downvotes / totalVotes) * 100).toFixed(1) : null;
  
  // Calculate area
  const area = calculateArea(drawing);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#333'
    }}>
      {/* Header with close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '1.4em', fontWeight: 'bold' }}>
            {drawing.title || `Untitled ${drawing.type}`}
          </h3>
          {drawing.description && (
            <p style={{ margin: '8px 0', color: '#666', fontSize: '1em' }}>{drawing.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#999',
            padding: '0 5px',
            lineHeight: '1'
          }}
          title="Close"
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: '0.95em', color: '#888', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
        <span>Type: <strong>{drawing.type}</strong></span>
        <span style={{ marginLeft: '15px' }}>Created: {formatDate(drawing.created_at)}</span>
        {area !== null && (
          <div style={{ marginTop: '8px', fontSize: '1em', color: '#007bff', fontWeight: '600' }}>
            Area: {(area / 1000000).toFixed(2)} km²
          </div>
        )}
      </div>

      {/* Vote Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        marginBottom: '15px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleUpvote}
            disabled={!user}
            style={{
              padding: '6px 12px',
              backgroundColor: userVote === 'upvote' ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: user ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '600',
              opacity: user ? 1 : 0.6,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Upvote"
          >
            ↑ {upvotes}
          </button>
          <button
            onClick={handleDownvote}
            disabled={!user}
            style={{
              padding: '6px 12px',
              backgroundColor: userVote === 'downvote' ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: user ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '600',
              opacity: user ? 1 : 0.6,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Downvote"
          >
            ↓ {downvotes}
          </button>
        </div>
        {(upvotes > 0 || downvotes > 0) && (
          <div style={{ fontSize: '12px', color: '#666', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>
              <span style={{ color: '#28a745', fontWeight: '600' }}>↑ {upvotes}</span>
              {upvotePercentage !== null && (
                <span style={{ color: '#666', marginLeft: '6px', fontSize: '11px' }}>
                  ({upvotePercentage}%)
                </span>
              )}
            </div>
            <div>
              <span style={{ color: '#dc3545', fontWeight: '600' }}>↓ {downvotes}</span>
              {downvotePercentage !== null && (
                <span style={{ color: '#666', marginLeft: '6px', fontSize: '11px' }}>
                  ({downvotePercentage}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '1.1em', fontWeight: '600' }}>
          Comments ({comments.length})
        </h4>
        
        {/* Comment List */}
        <div style={{ marginBottom: '15px', maxHeight: '300px', overflowY: 'auto' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic', padding: '8px', fontSize: '0.9em' }}>No comments yet.</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} style={{
                padding: '12px',
                marginBottom: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: '3px solid #007bff',
                fontSize: '0.95em'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#333' }}>
                    {comment.username || 'Anonymous'}
                  </span>
                  <span style={{ fontSize: '0.85em', color: '#888' }}>
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#555', fontSize: '0.9em' }}>{comment.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "Add a comment..." : "Please log in to comment"}
            disabled={!user}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={onCommentSubmit}
            disabled={!user || !newComment.trim()}
            style={{
              padding: '6px 12px',
              backgroundColor: user && newComment.trim() ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: user && newComment.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '600',
              width: '100%'
            }}
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>
  );
}

export default Overview;

