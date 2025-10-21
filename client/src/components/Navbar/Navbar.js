import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import { logOutUser } from '../../store/actions/authActions';
import './styles.css';

const Navbar = ({ auth, logOutUser }) => {
  const navigate = useNavigate();
  const onLogOut = (event) => {
    event.preventDefault();
    logOutUser(navigate);
  };

  return (
    <nav className="navbar">
      <h2 className="logo">MERN Boilerplate</h2>
      <ul className="nav-links flex-1">
        <li className="nav-item">
          <Link to="/">Home</Link>
        </li>
        {auth.isAuthenticated ? (
          <>
            <li className="nav-item">
              <Link to="/users">Users</Link>
            </li>
            <li className="nav-item">
              <Link to={`/${auth.me.username}`}>Profile</Link>
            </li>
            {auth.me?.role === 'ADMIN' && (
              <li className="nav-item">
                <Link to="/admin">Admin</Link>
              </li>
            )}
            <li className="flex-1" />
            <img className="avatar" src={auth.me.avatar} alt="User avatar" />
            <li className="nav-item">
              <button className="link-like" onClick={onLogOut} type="button">
                Log out
              </button>
            </li>
          </>
        ) : (
          <>
            <li className="flex-1" />

            <li className="nav-item">
              <Link to="/login">Login</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default compose(connect(mapStateToProps, { logOutUser }))(Navbar);
