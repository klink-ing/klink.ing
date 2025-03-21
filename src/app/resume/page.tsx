import * as React from 'react';
import  Link  from 'next/link';

import * as styles from './resume.module.scss';
import MainMenu from '../components/MainMenu';
import { Metadata } from 'next/types';

const Capabilities = () => (
  <ul className={styles.bulletList}>
    <li>
      <h4>HTML</h4> Experience with creating clean, accessible, semantic markup
      with an understanding of how code translates to document outlines for
      screen readers.
    </li>
    <li>
      <h4>CSS</h4> 20 years experience creating extensible and maintainable CSS
      using a variety of techniques from the latest CSS-in-JS technologies, CSS
      Custom Properties, pre-processors, post-processors or just plain pure CSS
      <ul className={styles.compactList}>
        <li>tailwind</li>
        <li>CSS modules</li>
        <li>styled-components</li>
        <li>Sass</li>
      </ul>
    </li>
    <li>
      <h4>Front-end</h4> Component-based front-end development using React and
      Typescript with a focus on functional programming principles
      <ul className={styles.compactList}>
        <li>React</li>
        <li>Modern DOM APIs</li>
        <li>NextJS</li>
        <li>Vite</li>
      </ul>
    </li>
    <li>
      <h4>Design</h4> A graphic design background gives me a keen eye for detail
      and focus on coding that preserves visual fidelity and usability as well
      as experience with visual design tools.
      <ul className={styles.compactList}>
        <li>Figma</li>
        <li>Photoshop</li>
        <li>Illustrator</li>
        <li>After Effects</li>
      </ul>
    </li>
  </ul>
);

const Stint: React.FunctionComponent<{
  title:string
  start?:string
  end?:string
  location:string
  organization:string
  url?:string
}> = ({ title, start, end, location, organization, url, children }) => (
  <>
    <div className={styles.topLine}>
      <h3 className={styles.jobTitle}>{title}</h3>
      <div style={{ whiteSpace: 'nowrap' }} className={styles.dates}>
        {start}
        {start && end && <> – </>}
        {end}
      </div>
    </div>
    <div className={styles.organization}>
      {url ? (
        <a href={url} target="_blank">
          {organization}
        </a>
      ) : (
        organization
      )}
    </div>
    <div className={styles.location}>{location}</div>
    {children}
  </>
);

const Resume = () => (
  <article className={styles.resume}>
    <header>
      <h1>Chris Klink</h1>
      <ul>
        <li>
          <a target="_blank" href="https://github.com/dogmar/">
            dogmar@github
          </a>
        </li>
        <li>
          <a href="mailto:chris@klink.ink">chris@klink.ink</a>
        </li>
      </ul>
    </header>
    <section className={styles.capabilities}>
      <h2>Capabilities</h2>
      <Capabilities />
    </section>
    <section>
      <h2>Experience</h2>
      <ul className={styles.block}>
        <li>
          <Stint
            title="Software Engineer"
            organization="Cleanlab"
            url="https://cleanlab.ai"
            location="San Francisco, CA"
            start="2024"
            end="Present"
          >
            <ul className={styles.bulletList}>
              <li>
                Led the development of a custom front-end component library,
                modernizing the UI framework by migrating from Chakra-UI to a
                more flexible and scalable solution.
              </li>
              <li>
                Designed and built user interfaces for AI-driven products,
                integrating REST APIs with React, Next.js, and Tailwind CSS to
                create seamless user experiences.
              </li>
              <li>
                Collaborated closely with product and engineering teams to
                refine UI/UX strategies, improving functionality and user
                engagement.
              </li>
            </ul>
          </Stint>
        </li>
        <li>
          <Stint
            title="Software Engineer"
            organization="Plural"
            url="https://plural.sh"
            location="Remote"
            start="2022"
            end="2024"
          >
            <ul className={styles.bulletList}>
              <li>
                Built intuitive user interfaces for a Kubernetes management
                dashboard, leveraging GraphQL, React, Vite, and Styled
                Components to enhance usability and responsiveness.
              </li>
              <li>
                Developed and maintained a reusable front-end component library
                to ensure consistency and efficiency across multiple products.
              </li>
              <li>
                Designed and implemented marketing and documentation websites,
                optimizing performance and accessibility.
              </li>
            </ul>
          </Stint>
        </li>
        <li>
          <Stint
            title="Senior Designer/Developer"
            organization="Camp + King"
            url="https://camp-king.com"
            location="San Francisco, CA"
            start="2015"
            end="2022"
          >
            <ul className={styles.bulletList}>
              <li>
                Designed and developed promotional websites for clients, meeting
                the needs of accessibility, fast loading times and
                maintainability, while maintaining all web services for the agency.
              </li>
              <li>
                Created HTML/JS-based banner ads with a focus on providing rich
                animations in very small file sizes.
              </li>
              <li>
                Created interactive web tools for real estate agents to create
                custom promotional graphics to share with their clients:
                <ul className={styles.compactList}>
                  <li>
                    <a href=" https://www.remaxhustle.com/welcome-mat/select-mat">
                      RE/MAX Welcome Mats
                    </a>
                  </li>
                  <li>
                    <a href="https://www.remaxhustle.com/hustlegraphic">
                      RE/MAX Hustlegraphics
                    </a>
                  </li>
                </ul>
              </li>
              <li>
                Created motion graphics and illustrations for national ad
                campaigns, including scripting reusable and customizable
                templates in After Effects and Photoshop.
              </li>
            </ul>
          </Stint>
        </li>
        <li>
          <Stint
            title="Senior Interactive Designer"
            organization="FCB"
            location="Seattle, WA + San Francisco, CA"
            start="2008"
            end="2015"
            url="https://www.fcb.com/"
          >
            <ul className={styles.bulletList}>
              <li>
                Designed and developed interactive promotional sites for clients
              </li>
              <li>Created print advertisements for clients</li>
              <li>Designed and animated digital advertisements</li>
            </ul>
          </Stint>
        </li>
        <li>
          <Stint
            title="Embedded Software Engineer"
            organization="The Boeing Company"
            location="Renton, WA"
            start="2003"
            end="2004"
            url="http://www.boeing.com/"
          >
            <ul className={styles.bulletList}>
              <li>
                Programmed bit-level communications software in C++ for aircraft
              </li>
              <li>
                Interpreted military specifications for implementation in
                software
              </li>
            </ul>
          </Stint>
        </li>
      </ul>
    </section>
    <section className={styles.education}>
      <h2>Education</h2>
      <ul className={styles.block}>
        <li>
          <Stint
            title={
              <>
                Associate of Applied Science in{' '}
                <span style={{ whiteSpace: 'nowrap' }}>Graphic Design</span>
              </>
            }
            organization="Seattle Central Creative Academy"
            location="Seattle, WA"
            end="2008"
            url="http://seattlecentralcreativeacademy.com/"
          />
        </li>
        <li>
          <Stint
            title={
              <>
                Bachelor of Science in{' '}
                <span style={{ whiteSpace: 'nowrap' }}>Computer Science</span>
              </>
            }
            organization="Western Washington University"
            location="Bellingham, WA"
            end="2003"
            url="https://www.wwu.edu/"
          />
        </li>
      </ul>
    </section>
  </article>
);

export const metadata: Metadata = {
  title: "Klink - Resumé",
  description: "What’s Klink been up to?",
};

export default Resume;
