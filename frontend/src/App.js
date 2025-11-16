import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Overview from './pages/Overview';
import Drawing from './pages/Drawing';
import Navigation from './components/Navigation';

function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
    }
  }, [location.pathname, displayLocation.pathname]);

  const onTransitionEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayLocation(location);
      setTransitionStage('fadeIn');
    }
  };

  return (
    <div 
      className={`page-transition ${transitionStage}`}
      onAnimationEnd={onTransitionEnd}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<Home />} />
        <Route path="/viewer" element={<Overview />} />
        <Route path="/drawer" element={<Drawing />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col w-full relative z-10">
        <Navigation />
        <AnimatedRoutes />
      </div>
    </Router>
  );
}

export default App;
