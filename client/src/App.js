import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import Cookies from 'js-cookie';

import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import Users from './pages/Users/Users';
import Admin from './pages/Admin/Admin';
import NotFound from './pages/NotFound/NotFound';

import Loader from './components/Loader/Loader';

import { logInUserWithOauth, loadMe } from './store/actions/authActions';

const App = ({ logInUserWithOauth, auth, loadMe }) => {
  useEffect(() => {
    loadMe();
  }, [loadMe]);

  //redosled hookova
  useEffect(() => {
    if (window.location.hash === '#_=_') window.location.hash = '';

    const cookieJwt = Cookies.get('x-auth-cookie');
    if (cookieJwt) {
      Cookies.remove('x-auth-cookie');
      logInUserWithOauth(cookieJwt);
    }
  }, []);

  useEffect(() => {
    if (!auth.appLoaded && !auth.isLoading && auth.token && !auth.isAuthenticated) {
      loadMe();
    }
  }, [auth.isAuthenticated, auth.token, loadMe, auth.isLoading, auth.appLoaded]);

  return (
    <>
      {auth.appLoaded ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/users" element={<Users />} />
          <Route path="/notfound" element={<NotFound />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/:username" element={<Profile />} />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      ) : (
        <Loader />
      )}
    </>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default compose(connect(mapStateToProps, { logInUserWithOauth, loadMe }))(App);
