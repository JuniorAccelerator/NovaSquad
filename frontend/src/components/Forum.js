import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Forum.css';

function Forum({ user }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadData, setThreadData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newThread, setNewThread] = useState({ title: '', content: '', category_id: '' });
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch threads when category is selected
  useEffect(() => {
    if (selectedCategory) {
      fetchThreads(selectedCategory.id);
    }
  }, [selectedCategory]);

  // Fetch thread data when thread is selected
  useEffect(() => {
    if (selectedThread) {
      fetchThreadData(selectedThread.id);
      const interval = setInterval(() => fetchThreadData(selectedThread.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedThread]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/forum/categories');
      setCategories(response.data);
      if (response.data.length > 0 && !selectedCategory) {
        setSelectedCategory(response.data[0]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const fetchThreads = async (categoryId) => {
    try {
      const response = await axios.get(`/api/forum/categories/${categoryId}/threads`);
      setThreads(response.data);
      setSelectedThread(null);
      setThreadData(null);
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError('Failed to load threads');
    }
  };

  const fetchThreadData = async (threadId) => {
    try {
      const response = await axios.get(`/api/forum/threads/${threadId}`);
      setThreadData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching thread data:', err);
      setError('Failed to load thread');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setLoading(true);
    try {
      const params = { q: searchQuery };
      if (searchCategory) {
        params.category_id = searchCategory;
      }
      const response = await axios.get('/api/forum/search', { params });
      setSearchResults(response.data);
      setError(null);
    } catch (err) {
      console.error('Error searching:', err);
      setError('Failed to search threads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThread.title.trim() || !newThread.content.trim() || !newThread.category_id) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/forum/threads', newThread);
      setNewThread({ title: '', content: '', category_id: '' });
      setShowNewThreadForm(false);
      // Refresh threads
      fetchThreads(newThread.category_id);
      // Select the new thread
      setSelectedThread(response.data.thread);
      fetchThreadData(response.data.thread.id);
    } catch (err) {
      console.error('Error creating thread:', err);
      setError(err.response?.data?.error || 'Failed to create thread');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || !selectedThread) return;

    setLoading(true);
    setError(null);

    try {
      await axios.post(`/api/forum/threads/${selectedThread.id}/posts`, {
        content: newPost.trim()
      });
      setNewPost('');
      fetchThreadData(selectedThread.id);
      // Refresh threads list to update last_post_at
      if (selectedCategory) {
        fetchThreads(selectedCategory.id);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await axios.delete(`/api/comments/${postId}`);
      if (selectedThread) {
        fetchThreadData(selectedThread.id);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      setError(err.response?.data?.error || 'Failed to delete post');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayThreads = isSearching ? searchResults : threads;

  return (
    <div className="forum-container">
      <div className="forum-header">
        <h2>Forum</h2>
        <p>Discuss and share with the community</p>
      </div>

      {/* Search Bar */}
      <div className="forum-search">
        <form onSubmit={handleSearch} className="forum-search-form">
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                setIsSearching(false);
                setSearchResults([]);
              }
            }}
            className="forum-search-input"
          />
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="forum-search-category"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          <button type="submit" className="forum-search-btn" disabled={loading}>
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="forum-error">
          {error}
        </div>
      )}

      <div className="forum-content">
        {/* Categories Sidebar */}
        <div className="forum-sidebar">
          <div className="forum-sidebar-header">
            <h3>Categories</h3>
          </div>
          <div className="forum-categories">
            {categories.map(category => (
              <div
                key={category.id}
                className={`forum-category ${selectedCategory?.id === category.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setIsSearching(false);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
              >
                <span className="forum-category-icon">{category.icon || ''}</span>
                <div className="forum-category-info">
                  <div className="forum-category-name">{category.name}</div>
                  <div className="forum-category-meta">
                    {category.thread_count || 0} threads
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="forum-main">
          {/* New Thread Form */}
          {showNewThreadForm && (
            <div className="forum-new-thread-form">
              <h3>Create New Thread</h3>
              <form onSubmit={handleCreateThread}>
                <select
                  value={newThread.category_id}
                  onChange={(e) => setNewThread({ ...newThread, category_id: e.target.value })}
                  required
                  className="forum-input"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Thread Title"
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  required
                  className="forum-input"
                />
                <textarea
                  placeholder="First post content..."
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  required
                  rows="4"
                  className="forum-textarea"
                />
                <div className="forum-form-actions">
                  <button type="submit" className="forum-submit-btn" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Thread'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewThreadForm(false);
                      setNewThread({ title: '', content: '', category_id: '' });
                    }}
                    className="forum-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Threads List */}
          {!selectedThread && !showNewThreadForm && (
            <div className="forum-threads-list">
              <div className="forum-threads-header">
                <h3>
                  {isSearching ? 'Search Results' : selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Select a Category'}
                </h3>
                {selectedCategory && (
                  <button
                    className="forum-new-thread-btn-small"
                    onClick={() => setShowNewThreadForm(true)}
                  >
                    + New Thread
                  </button>
                )}
              </div>
              {displayThreads.length === 0 ? (
                <div className="forum-empty">
                  <p>{isSearching ? 'No threads found' : 'No threads yet. Be the first to create one!'}</p>
                </div>
              ) : (
                <div className="forum-threads">
                  {displayThreads.map(thread => (
                    <div
                      key={thread.id}
                      className="forum-thread-item"
                      onClick={() => setSelectedThread(thread)}
                    >
                      <div className="forum-thread-title">{thread.title}</div>
                      <div className="forum-thread-meta">
                        <span>By {thread.username || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{thread.post_count || 0} posts</span>
                        {thread.last_post_at && (
                          <>
                            <span>•</span>
                            <span>Last: {formatDate(thread.last_post_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Thread View */}
          {selectedThread && threadData && !showNewThreadForm && (
            <div className="forum-thread-view">
              <div className="forum-thread-header">
                <button
                  className="forum-back-btn"
                  onClick={() => {
                    setSelectedThread(null);
                    setThreadData(null);
                  }}
                >
                  ← Back
                </button>
                <h3>{threadData.thread.title}</h3>
                <div className="forum-thread-info">
                  <span>Category: {threadData.thread.category_name}</span>
                  <span>•</span>
                  <span>By {threadData.thread.username || 'Anonymous'}</span>
                </div>
              </div>

              <div className="forum-posts">
                {threadData.posts.map(post => (
                  <div key={post.id} className="forum-post">
                    <div className="forum-post-header">
                      <div className="forum-post-author">
                        <strong>{post.username || 'Anonymous'}</strong>
                        <span className="forum-post-time">
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                      {user && post.user_id === user.id && (
                        <button
                          className="forum-delete-btn"
                          onClick={() => handleDeletePost(post.id)}
                          title="Delete post"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <div className="forum-post-content">
                      {post.content}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreatePost} className="forum-post-form">
                <textarea
                  className="forum-textarea"
                  placeholder="Write your reply..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows="2"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="forum-submit-btn"
                  disabled={loading || !newPost.trim()}
                >
                  {loading ? 'Posting...' : 'Post Reply'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Forum;
