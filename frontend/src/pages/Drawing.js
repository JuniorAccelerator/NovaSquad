import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Login from '../components/Login';
import Forum from '../components/Forum';
import '../App.css';

function Drawing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [geocoder, setGeocoder] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [drawingManager, setDrawingManager] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [drawingMode, setDrawingMode] = useState(null);
  const [sharedDrawings, setSharedDrawings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingDrawing, setPendingDrawing] = useState(null);
  const [drawingTitle, setDrawingTitle] = useState('');
  const [drawingDescription, setDrawingDescription] = useState('');
  const [drawingPlaceType, setDrawingPlaceType] = useState('');
  const [placeTypeError, setPlaceTypeError] = useState('');
  const [apiKeyError, setApiKeyError] = useState(null);
  const [activeTab, setActiveTab] = useState('map'); // 'map' or 'forum'
  const [selectedPlaceType, setSelectedPlaceType] = useState(null);
  const mapRef = useRef(null);
  const scriptLoaded = useRef(false);
  const drawingModeRef = useRef(null);
  const overlaysRef = useRef([]);

  // Disable scrolling on mount, re-enable on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token is still valid
      axios.get('/api/auth/me')
        .then(response => {
          if (response.data.success) {
            setIsAuthenticated(true);
            // Update user with latest data from backend (including isAdmin)
            const updatedUser = response.data.user;
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
          }
        })
        .catch(error => {
          // Token invalid or expired
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          setIsAuthenticated(false);
        });
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    // Ensure isAdmin and canDraw are set (default to false if undefined)
    const userWithPermissions = {
      ...userData,
      isAdmin: userData.isAdmin || false,
      canDraw: userData.canDraw === true
    };
    setUser(userWithPermissions);
    localStorage.setItem('user', JSON.stringify(userWithPermissions));
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]);

  // Fetch shared drawings from backend
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchDrawings = () => {
      axios.get('/api/drawings')
        .then(response => {
          setSharedDrawings(response.data);
        })
        .catch(error => {
          console.error('Error fetching drawings:', error);
        });
    };

    fetchDrawings();
    // Poll for new drawings every 2 seconds
    const interval = setInterval(fetchDrawings, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

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

    // Load Google Maps script with drawing and geometry libraries
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Ensure DOM is ready before initializing map
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

    // Initialize Drawing Manager
    const newDrawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          window.google.maps.drawing.OverlayType.MARKER,
          window.google.maps.drawing.OverlayType.CIRCLE,
          window.google.maps.drawing.OverlayType.POLYGON,
          window.google.maps.drawing.OverlayType.POLYLINE,
          window.google.maps.drawing.OverlayType.RECTANGLE,
        ],
      },
      markerOptions: {
        icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
      },
      circleOptions: {
        fillColor: '#ffff00',
        fillOpacity: 0.3,
        strokeWeight: 2,
        clickable: false,
        editable: true,
        zIndex: 1,
      },
      polygonOptions: {
        fillColor: '#ffff00',
        fillOpacity: 0.3,
        strokeWeight: 2,
        clickable: false,
        editable: true,
        zIndex: 1,
      },
      polylineOptions: {
        strokeColor: '#ff0000',
        strokeWeight: 3,
        clickable: false,
        editable: true,
        zIndex: 1,
      },
      rectangleOptions: {
        fillColor: '#ffff00',
        fillOpacity: 0.3,
        strokeWeight: 2,
        clickable: false,
        editable: true,
        zIndex: 1,
      },
    });

    newDrawingManager.setMap(newMap);

    // Listen for drawing completion
    newDrawingManager.addListener('overlaycomplete', (event) => {
      const newDrawing = event.overlay;
      setDrawings(prev => [...prev, newDrawing]);
      
      // Extract drawing data
      let drawingData = null;
      try {
        if (event.type === 'marker') {
          const position = newDrawing.getPosition();
          drawingData = {
            type: 'marker',
            data: {
              position: { lat: position.lat(), lng: position.lng() }
            }
          };
        } else if (event.type === 'circle') {
          const center = newDrawing.getCenter();
          drawingData = {
            type: 'circle',
            data: {
              center: { lat: center.lat(), lng: center.lng() },
              radius: newDrawing.getRadius()
            }
          };
        } else if (event.type === 'polygon') {
          const path = newDrawing.getPath();
          drawingData = {
            type: 'polygon',
            data: {
              paths: path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
            }
          };
        } else if (event.type === 'polyline') {
          const path = newDrawing.getPath();
          drawingData = {
            type: 'polyline',
            data: {
              path: path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
            }
          };
        } else if (event.type === 'rectangle') {
          const bounds = newDrawing.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          drawingData = {
            type: 'rectangle',
            data: {
              bounds: {
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng()
              }
            }
          };
        }

        // Store drawing data and overlay for later saving (after user enters title/description)
        if (drawingData) {
          setPendingDrawing({ drawingData, overlay: newDrawing, eventType: event.type });
          // Initialize place type from previous selection if available
          if (selectedPlaceType) {
            setDrawingPlaceType(selectedPlaceType);
            setPlaceTypeError('');
          }
          setShowModal(true);
        }
      } catch (error) {
        console.error('Error extracting drawing data:', error);
      }
      
      // Note: Click listeners will be added after title/description are saved
    });

    // Add click listener to map (only when not in drawing mode)
    newMap.addListener('click', (e) => {
      if (!drawingModeRef.current) {
        placeMarkerAndPanTo(e.latLng, newMap, newMarker, newGeocoder, newInfoWindow);
      }
    });

    setMap(newMap);
    setGeocoder(newGeocoder);
    setInfoWindow(newInfoWindow);
    setMarker(newMarker);
    setDrawingManager(newDrawingManager);
  };


  // Display shared drawings on map
  useEffect(() => {
    if (!map || !window.google || !infoWindow) return;

    // Clear existing shared overlays
    overlaysRef.current.forEach(overlay => {
      if (overlay) {
        overlay.setMap(null);
      }
    });
    overlaysRef.current = [];

    // Display all shared drawings
    sharedDrawings.forEach(drawingData => {
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
            fillColor: '#00ff00',
            fillOpacity: 0.2,
            strokeWeight: 2,
            strokeColor: '#00aa00',
            clickable: true,
            editable: false
          });
        } else if (type === 'polygon') {
          overlay = new window.google.maps.Polygon({
            paths: data.paths.map(p => ({ lat: p.lat, lng: p.lng })),
            map: map,
            fillColor: '#00ff00',
            fillOpacity: 0.2,
            strokeWeight: 2,
            strokeColor: '#00aa00',
            clickable: true,
            editable: false
          });
        } else if (type === 'polyline') {
          overlay = new window.google.maps.Polyline({
            path: data.path.map(p => ({ lat: p.lat, lng: p.lng })),
            map: map,
            strokeColor: '#00aa00',
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
            fillColor: '#00ff00',
            fillOpacity: 0.2,
            strokeWeight: 2,
            strokeColor: '#00aa00',
            clickable: true,
            editable: false
          });
        }

        // Add click listener to show info
        if (overlay) {
          overlay.addListener('click', () => {
            let content = `<strong>${drawingData.title || `Shared Drawing: ${type}`}</strong>`;
            if (drawingData.description) {
              content += `<br><em>${drawingData.description}</em>`;
            }
            content += `<br>Type: ${type}`;
            
            if (type === 'circle' && data.radius) {
              content += `<br>Radius: ${data.radius.toFixed(2)} meters`;
            } else if (type === 'polygon' && data.paths && window.google.maps.geometry) {
              const path = data.paths.map(p => new window.google.maps.LatLng(p.lat, p.lng));
              const area = window.google.maps.geometry.spherical.computeArea(path);
              content += `<br>Area: ${(area / 1000000).toFixed(2)} km²`;
            } else if (type === 'rectangle' && data.bounds && window.google.maps.geometry) {
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
              const area = window.google.maps.geometry.spherical.computeArea(path);
              content += `<br>Area: ${(area / 1000000).toFixed(2)} km²`;
            }
            infoWindow.setContent(content);
            if (type === 'marker') {
              infoWindow.open(map, overlay);
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
              infoWindow.setPosition(position);
              infoWindow.open(map);
            }
          });
          overlaysRef.current.push(overlay);
        }
      } catch (error) {
        console.error('Error displaying shared drawing:', error);
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
  }, [map, sharedDrawings, infoWindow]);

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

  const setDrawingTool = (tool) => {
    if (!drawingManager) return;
    
    if (drawingMode === tool) {
      // If clicking the same tool, disable it
      drawingManager.setDrawingMode(null);
      setDrawingMode(null);
      drawingModeRef.current = null;
    } else {
      // Set the new drawing mode
      let overlayType;
      switch(tool) {
        case 'marker':
          overlayType = window.google.maps.drawing.OverlayType.MARKER;
          break;
        case 'circle':
          overlayType = window.google.maps.drawing.OverlayType.CIRCLE;
          break;
        case 'polygon':
          overlayType = window.google.maps.drawing.OverlayType.POLYGON;
          break;
        case 'polyline':
          overlayType = window.google.maps.drawing.OverlayType.POLYLINE;
          break;
        case 'rectangle':
          overlayType = window.google.maps.drawing.OverlayType.RECTANGLE;
          break;
        default:
          overlayType = null;
      }
      drawingManager.setDrawingMode(overlayType);
      setDrawingMode(tool);
      drawingModeRef.current = tool;
    }
  };

  const clearDrawings = () => {
    drawings.forEach(drawing => {
      drawing.setMap(null);
    });
    setDrawings([]);
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
      setDrawingMode(null);
      drawingModeRef.current = null;
    }
  };

  const handleSaveDrawing = () => {
    if (!pendingDrawing) return;

    // Validate place type is selected
    if (!drawingPlaceType || drawingPlaceType === '') {
      setPlaceTypeError('Please select a place type');
      return;
    }

    setPlaceTypeError('');

    const { drawingData, overlay, eventType } = pendingDrawing;
    
    // Add title, description, and place_type to drawing data
    const drawingToSave = {
      ...drawingData,
      title: drawingTitle || `Untitled ${eventType}`,
      description: drawingDescription || '',
      place_type: drawingPlaceType
    };

    // Save to backend
    axios.post('/api/drawings', drawingToSave)
      .then(response => {
        console.log('Drawing saved:', response.data);
        
        // Add click listener to show info with title and description
        const savedDrawing = response.data.drawing;
        if (eventType === 'marker') {
          overlay.addListener('click', () => {
            let content = `<strong>${savedDrawing.title || 'Custom Marker'}</strong>`;
            if (savedDrawing.description) {
              content += `<br><em>${savedDrawing.description}</em>`;
            }
            infoWindow.setContent(content);
            infoWindow.open(map, overlay);
          });
        } else {
          overlay.addListener('click', () => {
            let content = `<strong>${savedDrawing.title || `Drawing: ${eventType}`}</strong>`;
            if (savedDrawing.description) {
              content += `<br><em>${savedDrawing.description}</em>`;
            }
            content += `<br>Type: ${eventType}`;
            
            if (eventType === 'circle') {
              const radius = overlay.getRadius();
              content += `<br>Radius: ${radius.toFixed(2)} meters`;
            } else if (eventType === 'polygon') {
              const path = overlay.getPath();
              if (path && window.google.maps.geometry) {
                const area = window.google.maps.geometry.spherical.computeArea(path);
                content += `<br>Area: ${(area / 1000000).toFixed(2)} km²`;
              }
            } else if (eventType === 'rectangle') {
              const bounds = overlay.getBounds();
              if (bounds && window.google.maps.geometry) {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                const path = [
                  sw,
                  new window.google.maps.LatLng(ne.lat(), sw.lng()),
                  ne,
                  new window.google.maps.LatLng(sw.lat(), ne.lng())
                ];
                const area = window.google.maps.geometry.spherical.computeArea(path);
                content += `<br>Area: ${(area / 1000000).toFixed(2)} km²`;
              }
            }
            
            infoWindow.setContent(content);
            let position;
            if (eventType === 'polygon' || eventType === 'polyline') {
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
            infoWindow.setPosition(position);
            infoWindow.open(map);
          });
        }
        
        // Close modal and reset
        setShowModal(false);
        setDrawingTitle('');
        setDrawingDescription('');
        setDrawingPlaceType('');
        setPlaceTypeError('');
        setPendingDrawing(null);
      })
      .catch(error => {
        console.error('Error saving drawing:', error);
        alert('Error saving drawing. Please try again.');
      });
  };

  const handleCancelDrawing = () => {
    // Remove the overlay from map
    if (pendingDrawing && pendingDrawing.overlay) {
      pendingDrawing.overlay.setMap(null);
      setDrawings(prev => prev.filter(d => d !== pendingDrawing.overlay));
    }
    
    // Close modal and reset
    setShowModal(false);
    setDrawingTitle('');
    setDrawingDescription('');
    setDrawingPlaceType('');
    setPlaceTypeError('');
    setPendingDrawing(null);
  };


  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Check if user has drawing privileges - redirect users without drawing privileges
  if (user && user.canDraw !== true) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>🔒 Access Denied</h1>
        <p style={{ color: '#666', fontSize: '1.2em', marginBottom: '30px' }}>
          Drawing privileges are required to access Drawer Mode.<br />
          Please contact an admin to grant you drawing privileges.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1em',
            fontWeight: '600'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

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
            <div className="drawing-controls">
              <h3>Drawing Tools</h3>
              <div className="drawing-buttons">
                <button 
                  className={`draw-btn ${drawingMode === 'marker' ? 'active' : ''}`}
                  onClick={() => setDrawingTool('marker')}
                  title="Draw Marker"
                >
                  📍 Marker
                </button>
                <button 
                  className={`draw-btn ${drawingMode === 'circle' ? 'active' : ''}`}
                  onClick={() => setDrawingTool('circle')}
                  title="Draw Circle"
                >
                  ⭕ Circle
                </button>
                <button 
                  className={`draw-btn ${drawingMode === 'polygon' ? 'active' : ''}`}
                  onClick={() => setDrawingTool('polygon')}
                  title="Draw Polygon"
                >
                  🔷 Polygon
                </button>
                <button 
                  className={`draw-btn ${drawingMode === 'polyline' ? 'active' : ''}`}
                  onClick={() => setDrawingTool('polyline')}
                  title="Draw Line"
                >
                  ➖ Line
                </button>
                <button 
                  className={`draw-btn ${drawingMode === 'rectangle' ? 'active' : ''}`}
                  onClick={() => setDrawingTool('rectangle')}
                  title="Draw Rectangle"
                >
                  ▭ Rectangle
                </button>
                <button 
                  className="draw-btn clear-btn"
                  onClick={clearDrawings}
                  title="Clear All Drawings"
                >
                  🗑️ Clear
                </button>
              </div>
              {drawingMode && (
                <p className="drawing-hint">Click on the map to start drawing. Click the same tool again to disable.</p>
              )}
            </div>

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

      {/* Modal for Title and Description */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && handleCancelDrawing()}>
          <div className="modal-content">
            <h2>Save Your Drawing</h2>
            <p>Please provide a title, description, and place type for your project:</p>
            
            <div className="modal-form">
              <label htmlFor="drawing-title">Title *</label>
              <input
                id="drawing-title"
                type="text"
                className="modal-input"
                placeholder="Enter a title for your drawing..."
                value={drawingTitle}
                onChange={(e) => setDrawingTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveDrawing();
                  }
                }}
                autoFocus
              />
              
              <label htmlFor="drawing-description">Description</label>
              <textarea
                id="drawing-description"
                className="modal-textarea"
                placeholder="Enter a description (optional)..."
                value={drawingDescription}
                onChange={(e) => setDrawingDescription(e.target.value)}
                rows="4"
              />
              
              <label htmlFor="drawing-place-type">Place Type *</label>
              <select
                id="drawing-place-type"
                className={`modal-input ${placeTypeError ? 'error' : ''}`}
                value={drawingPlaceType}
                onChange={(e) => {
                  setDrawingPlaceType(e.target.value);
                  setSelectedPlaceType(e.target.value);
                  if (e.target.value) {
                    setPlaceTypeError('');
                  }
                }}
                required
              >
                <option value="">-- Select a place type --</option>
                <option value="building">🏢 Building</option>
                <option value="landmarks">🗼 Landmarks</option>
                <option value="parks">🌳 Parks</option>
                <option value="infrastructures">Infrastructures</option>
              </select>
              {placeTypeError && (
                <span className="error-message" style={{ color: '#dc3545', fontSize: '0.875em', marginTop: '-10px' }}>
                  {placeTypeError}
                </span>
              )}
              
              <div className="modal-buttons">
                <button className="btn modal-btn-cancel" onClick={handleCancelDrawing}>
                  Cancel
                </button>
                <button className="btn modal-btn-save" onClick={handleSaveDrawing}>
                  Save Drawing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Drawing;

