import { Link } from 'react-router';
import { ArrowUpRight, Boxes, CircleDollarSign, Code2, ShoppingCart } from 'lucide-react';
import { PublicHeader } from '@/app/components/public/PublicHeader';
import { PublicSiteFooter } from '@/app/components/public/PublicSiteFooter';
import { RuleLabel } from '@/app/components/public/PublicPrimitives';

const focusAreas = [
  {
    icon: Boxes,
    title: 'Inventory and stock control',
    description: 'Keep product, warehouse, receiving and stock movement records connected across daily operations.',
  },
  {
    icon: ShoppingCart,
    title: 'Purchasing and sales',
    description: 'Follow the flow from supplier orders and goods received through sales and customer records.',
  },
  {
    icon: CircleDollarSign,
    title: 'Accounting and reporting',
    description: 'Bring business activity into clear financial records and reports for owners and teams.',
  },
];

export default function AboutPage() {
  return (
    <div className="public-shell about-page min-h-screen overflow-x-hidden">
      <PublicHeader navItems={[{ label: 'Home', href: '/' }, { label: 'About BluePeak', href: '#about-bluepeak' }, { label: 'What we build', href: '#what-we-build' }]} />

      <main>
        <section className="about-intro" aria-labelledby="about-title">
          <div className="about-container about-intro__inner">
            <div className="about-intro__copy">
              <RuleLabel>BLUEPEAK RWANDA DIGITAL SOLUTIONS</RuleLabel>
              <h1 id="about-title">Practical business software, built in Kigali.</h1>
              <p>We build digital tools that help businesses keep their stock, purchasing, sales and accounting work connected. KUBIKA is our business management system for teams that want a clearer view of daily operations.</p>
              <a className="about-intro__link" href="#about-bluepeak">Meet BluePeak Rwanda <ArrowUpRight aria-hidden="true" /></a>
            </div>
            <figure className="about-intro__portrait">
              <div className="about-intro__portrait-frame">
                <span className="about-intro__portrait-ring" aria-hidden="true" />
                <img src="/bluepeak-rwanda-profile.jpeg" alt="Jay, software developer at BluePeak Rwanda Digital Solutions" />
              </div>
              <figcaption>
                <span className="about-intro__portrait-team">BLUEPEAK RWANDA</span>
                <strong>Jay</strong>
                <span className="about-intro__portrait-role"><Code2 aria-hidden="true" /> Software Developer</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="about-bluepeak" className="about-story" aria-labelledby="about-bluepeak-title">
          <div className="about-container about-story__inner">
            <div>
              <RuleLabel>WHO WE ARE</RuleLabel>
              <h2 id="about-bluepeak-title">A Rwanda-based team focused on useful technology.</h2>
            </div>
            <div className="about-story__copy">
              <p>BluePeak Rwanda Digital Solutions Ltd is a technology company based in Kicukiro, Kigali. We create software for the real work of running a business, with tools that bring everyday records into one dependable workspace.</p>
              <p>Our focus is straightforward: make business information easier to record, understand and act on. KUBIKA brings inventory, purchasing, sales and accounting workflows together, so teams can spend less time reconciling separate records and more time serving their customers.</p>
            </div>
          </div>
        </section>

        <section id="what-we-build" className="about-work" aria-labelledby="about-work-title">
          <div className="about-container">
            <div className="about-work__heading">
              <RuleLabel>WHAT WE BUILD</RuleLabel>
              <h2 id="about-work-title">One clearer view of business operations.</h2>
              <p>KUBIKA connects the records teams rely on to manage stock, money and day-to-day decisions.</p>
            </div>
            <div className="about-work__grid">
              {focusAreas.map(({ icon: Icon, title, description }) => (
                <article className="about-work-card" key={title}>
                  <span className="about-work-card__icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <Link className="about-work__cta" to="/pricing">Explore KUBIKA <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="about-contact" aria-labelledby="about-contact-title">
          <div className="about-container about-contact__inner">
            <div>
              <RuleLabel>GET IN TOUCH</RuleLabel>
              <h2 id="about-contact-title">Talk with our team.</h2>
              <p>Have a question about KUBIKA or working with BluePeak Rwanda? Get in touch.</p>
            </div>
            <address>
              <a href="tel:+250780936645">+250 780 936 645</a>
              <a href="mailto:uwinezajd2@gmail.com">uwinezajd2@gmail.com</a>
              <span>KK 398 St, Kagarama, Kicukiro, Kigali, Rwanda</span>
            </address>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
