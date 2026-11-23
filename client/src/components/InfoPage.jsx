import { useEffect, useRef } from 'react'

const titles = { about: 'About Sift', contact: 'Contact', privacy: 'Privacy Policy' }

export default function InfoPage({ page }) {
  const heading = useRef(null)
  useEffect(() => {
    document.title = `${titles[page]} | Sift`
    heading.current?.focus()
    window.scrollTo(0, 0)
    return () => { document.title = 'Sift' }
  }, [page])

  return (
    <section className="info-page" aria-labelledby="info-heading">
      <a href="#">Back to news</a>
      <h2 id="info-heading" ref={heading} tabIndex={-1}>{titles[page]}</h2>
      {page === 'about' && <>
        <p>Sift brings news from multiple publishers into one place so you don't need to open 20 tabs just to read the news. Browse top headlines or explore World, Technology, Business, Science, Sports, and Entertainment.</p>
        <p>Search stories, filter by publisher or date, and save articles to revisit in your browser. Read story links take you to the original publisher.</p>
        <p>Sift is an independent news aggregation project. Articles, images, and reporting belong to their respective publishers.</p>
      </>}
      {page === 'contact' && <>
        <p>Have feedback, a question, or an issue to report?</p>
        <p>Add email here later.</p>
      </>}
      {page === 'privacy' && <>
        <h3>Saved articles</h3>
        <p>Sift stores your bookmarks in your browser using localStorage. No account is required. Bookmarks are not sent to Sift's server and do not sync between devices. You can remove individual bookmarks or clear this site's browser data to delete them all.</p>
        <h3>Browsing and searching</h3>
        <p>Your searches, selected filters, and page requests are sent to Sift's API to retrieve matching articles. Sift stores article metadata in its database.</p>
        <h3>External publishers</h3>
        <p>Article images may load from external websites, which receive standard connection information such as your IP address. Opening an article takes you to the publisher's website.</p>
      </>}
    </section>
  )
}
