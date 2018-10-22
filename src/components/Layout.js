import React from 'react'
import Helmet from 'react-helmet'

import Navbar from '../components/Navbar'
import './all.sass'

const TemplateWrapper = ({ children }) => (
  <div>
    <Helmet title="Blog - welcomattic" />
    <Navbar />
    <div>{children}</div>
    <footer className="container has-text-centered margin-bottom-md">
      © Mathieu Santo Stefano--Féron | {(new Date()).getFullYear()}
    </footer>
  </div>
)

export default TemplateWrapper
