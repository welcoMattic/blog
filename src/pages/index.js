import React from 'react'
import PropTypes from 'prop-types'
import { Link, graphql } from 'gatsby'
import Layout from '../components/Layout'

export default class IndexPage extends React.Component {
  render() {
    const { data } = this.props
    const { edges: posts } = data.allMarkdownRemark

    return (
      <Layout>
        <section className="section">
          <div className="container">
            <div className="columns">
              <div className="column is-three-fifths is-offset-one-fifth">
                <div className="content">
                  <h1 className="has-text-weight-bold is-size-2">Derniers billets</h1>
                </div>
                {posts
                  .map(({ node: post }) => (
                    <div
                      className="content is-medium"
                      style={{ border: '1px solid #eaecee', padding: '2em 4em' }}
                      key={post.id}
                    >
                      <p>
                        <Link className="has-text-primary" to={post.fields.slug}>
                          {post.frontmatter.title}
                        </Link>
                        <span> &bull; </span>
                        <small>{post.frontmatter.date}</small>
                      </p>
                      <p>
                        {post.excerpt}
                        <br />
                        <br />
                        <Link className="button is-small" to={post.fields.slug}>
                          Lire la suite →
                        </Link>
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>
      </Layout>
    )
  }
}

IndexPage.propTypes = {
  data: PropTypes.shape({
    allMarkdownRemark: PropTypes.shape({
      edges: PropTypes.array,
    }),
    markdownRemark: PropTypes.shape({
      edges: PropTypes.array,
    }),
  }),
}

export const pageQuery = graphql`
  query IndexQuery {
    allMarkdownRemark(
      sort: { order: DESC, fields: [frontmatter___date] },
      filter: { frontmatter: { templateKey: { eq: "blog-post" } }}
    ) {
      edges {
        node {
          excerpt(pruneLength: 400)
          id
          fields {
            slug
          }
          frontmatter {
            title
            templateKey
            date(formatString: "DD/MM/YYYY")
          }
        }
      }
    }
  }
`
