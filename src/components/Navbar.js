import React from 'react'
import { Link } from 'gatsby'
import github from '../img/github-icon.svg'
import twitter from '../img/twitter-icon.svg'

const Navbar = () => (
  <div className="container">
    <nav className="navbar is-transparent">
      <div className="navbar-brand">
        <h1>
          <Link to="/" className="navbar-item title">welcomattic's blog</Link>
        </h1>
      </div>
      
      <div className="navbar-end">
        <Link className="navbar-item" to="/about">
          À propos
        </Link>
        <a
          className="navbar-item"
          href="https://github.com/welcomattic"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="icon">
            <img src={github} alt="Github" />
          </span>
        </a>
        <a
          className="navbar-item"
          href="https://twitter.com/welcomattic"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="icon">
            <img src={twitter} alt="Twitter" />
          </span>
        </a>
      </div>
    </nav>
  </div>
)

export default Navbar
