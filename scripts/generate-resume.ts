import * as fs from "fs";
import * as path from "path";
import { Markdoc } from "@markdoc/markdoc";
import { config } from "./markdoc-config";

// This script reads the Markdoc markdown resume, transforms it with Markdoc,
// and generates the React component file

interface ContactLink {
  text: string;
  href: string;
  email: boolean;
}

interface StintData {
  title: string;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
  bullets: string[];
  pageBreak?: boolean;
}

interface ResumeData {
  name: string;
  contacts: ContactLink[];
  experience: StintData[];
  education: StintData[];
}

function extractResumeData(content: any): ResumeData {
  const data: ResumeData = {
    name: "",
    contacts: [],
    experience: [],
    education: [],
  };

  let currentSection: "experience" | "education" | null = null;

  function traverse(node: any) {
    if (!node) return;

    if (node.type === "heading") {
      const level = node.attributes?.level || 1;
      const text = getTextContent(node);
      
      if (level === 1) {
        data.name = text;
      } else if (level === 2) {
        if (text === "Experience") {
          currentSection = "experience";
        } else if (text === "Education") {
          currentSection = "education";
        }
      }
    } else if (node.type === "list" && !currentSection) {
      // Contact links in header
      node.children?.forEach((item: any) => {
        const link = findLink(item);
        if (link) {
          data.contacts.push({
            text: link.text,
            href: link.href,
            email: link.href.startsWith("mailto:"),
          });
        }
      });
    } else if (node.type === "tag" && node.tag === "stint") {
      const stint: StintData = {
        title: node.attributes?.title || "",
        start: node.attributes?.start,
        end: node.attributes?.end,
        location: node.attributes?.location || "",
        organization: node.attributes?.organization || "",
        url: node.attributes?.url,
        bullets: [],
        pageBreak: node.attributes?.pageBreak === true,
      };
      
      // Extract bullets from children (handle both regular lists and bulletList tags)
      // Regular lists default to bulletList, compactList tags would use compactList
      node.children?.forEach((child: any) => {
        if (child.type === "list") {
          // Regular markdown list - default to bulletList
          child.children?.forEach((item: any) => {
            const bullet = extractBulletWithLinks(item);
            if (bullet) {
              stint.bullets.push(bullet);
            }
          });
        } else if (child.type === "tag" && child.tag === "bulletList") {
          // Explicit bulletList tag
          child.children?.forEach((listChild: any) => {
            if (listChild.type === "list") {
              listChild.children?.forEach((item: any) => {
                const bullet = extractBulletWithLinks(item);
                if (bullet) {
                  stint.bullets.push(bullet);
                }
              });
            }
          });
        }
      });
      
      if (currentSection === "experience") {
        data.experience.push(stint);
      } else if (currentSection === "education") {
        data.education.push(stint);
      }
    }

    // Recursively traverse children
    if (node.children) {
      node.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(content);
  return data;
}

function getTextContent(node: any): string {
  if (typeof node === "string") return node;
  if (node.children) {
    return node.children.map(getTextContent).join("");
  }
  return "";
}

function findLink(node: any): { text: string; href: string } | null {
  if (node.type === "link") {
    return {
      text: getTextContent(node),
      href: node.attributes?.href || "",
    };
  }
  if (node.children) {
    for (const child of node.children) {
      const link = findLink(child);
      if (link) return link;
    }
  }
  return null;
}

function extractBulletWithLinks(node: any): string {
  // Extract text and preserve link structure
  if (typeof node === "string") return node;
  
  let result = "";
  if (node.children) {
    for (const child of node.children) {
      if (child.type === "link") {
        const text = getTextContent(child);
        const href = child.attributes?.href || "";
        result += `[${text}](${href})`;
      } else if (child.type === "list") {
        // Handle nested lists
        const nestedItems: string[] = [];
        child.children?.forEach((item: any) => {
          const itemText = extractBulletWithLinks(item);
          if (itemText) nestedItems.push(itemText);
        });
        if (nestedItems.length > 0) {
          result += ": " + nestedItems.map(item => `[${item}](${item})`).join(", ");
        }
      } else {
        result += extractBulletWithLinks(child);
      }
    }
  }
  return result;
}

function extractListItems(node: any, listType: "bulletList" | "compactList" = "bulletList"): string[] {
  const items: string[] = [];
  
  if (node.type === "list") {
    node.children?.forEach((item: any) => {
      const text = getTextContent(item);
      if (text) items.push(text);
    });
  } else if (node.type === "tag" && (node.tag === "bulletList" || node.tag === "compactList")) {
    node.children?.forEach((child: any) => {
      if (child.type === "list") {
        child.children?.forEach((item: any) => {
          const text = getTextContent(item);
          if (text) items.push(text);
        });
      }
    });
  }
  
  return items;
}

function escapeJsxString(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, " ").trim();
}

function formatTitle(title: string): string {
  // Handle special cases like "Associate of Applied Science in Graphic Design"
  if (title.includes(" in ")) {
    const [prefix, suffix] = title.split(" in ");
    return `<>${prefix} in <span style={{ whiteSpace: "nowrap" }}>${suffix}</span></>`;
  }
  return `"${escapeJsxString(title)}"`;
}

function generateComponentCode(data: ResumeData): string {
  return `import * as React from "react";

import { Metadata } from "next/types";
import styles from "./resume.module.scss";

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
  title: React.ReactNode;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
  children?: React.ReactNode;
}> = ({ title, start, end, location, organization, url, children }) => (
  <>
    <div className={styles.topLine}>
      <h3 className={styles.jobTitle}>{title}</h3>
      <div style={{ whiteSpace: "nowrap" }} className={styles.dates}>
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
      <h1>${data.name}</h1>
      <ul>
${data.contacts
  .map(
    (contact) =>
      `        <li>
          <a ${contact.email ? "" : 'target="_blank"'} href="${contact.href}">
            ${contact.text}
          </a>
        </li>`
  )
  .join("\n")}
      </ul>
    </header>
    <section className={styles.capabilities}>
      <h2>Capabilities</h2>
      <Capabilities />
    </section>
    <section style={{ pageBreakBefore: "always" }}>
      <h2>Experience</h2>
      <ul className={styles.block}>
${data.experience
  .map((exp) => {
    const pageBreak = exp.pageBreak
      ? `        <li style={{ pageBreakBefore: "always" }}>`
      : `        <li>`;
    return `${pageBreak}
          <Stint
            title="${escapeJsxString(exp.title)}"
            organization="${escapeJsxString(exp.organization)}"
            ${exp.url ? `url="${exp.url}"` : ""}
            location="${escapeJsxString(exp.location)}"
            ${exp.start ? `start="${exp.start}"` : ""}
            ${exp.end ? `end="${exp.end}"` : ""}
          >
            <ul className={styles.bulletList}>
${exp.bullets
  .map((bullet) => {
    // Check if bullet contains markdown links
    const linkMatches = [...bullet.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    if (linkMatches.length > 0) {
      let processedBullet = bullet;
      const links: Array<{ text: string; url: string }> = [];
      
      // Extract all links
      linkMatches.forEach((match) => {
        const [fullMatch, linkText, linkUrl] = match;
        links.push({ text: linkText, url: linkUrl });
        processedBullet = processedBullet.replace(fullMatch, "").trim();
      });
      
      if (processedBullet.endsWith(":")) {
        // Has nested list with links
        return `              <li>
                ${escapeJsxString(processedBullet)}
                <ul className={styles.compactList}>
${links.map(link => `                  <li>
                    <a href="${link.url}">${link.text}</a>
                  </li>`).join("\n")}
                </ul>
              </li>`;
      } else {
        // Inline links
        let result = bullet;
        linkMatches.forEach((match) => {
          const [fullMatch, linkText, linkUrl] = match;
          result = result.replace(fullMatch, `<a href="${linkUrl}">${linkText}</a>`);
        });
        return `              <li>${escapeJsxString(result)}</li>`;
      }
    }
    return `              <li>${escapeJsxString(bullet)}</li>`;
  })
  .join("\n")}
            </ul>
          </Stint>
        </li>`;
  })
  .join("\n")}
      </ul>
    </section>
    <section className={styles.education}>
      <h2>Education</h2>
      <ul className={styles.block}>
${data.education
  .map((edu) => {
    const titleStr = formatTitle(edu.title);
    return `        <li>
          <Stint
            title={${titleStr}}
            organization="${escapeJsxString(edu.organization)}"
            location="${escapeJsxString(edu.location)}"
            ${edu.end ? `end="${edu.end}"` : ""}
            ${edu.url ? `url="${edu.url}"` : ""}
          />
        </li>`;
  })
  .join("\n")}
      </ul>
    </section>
  </article>
);

export const metadata: Metadata = {
  title: "Klink - Resumé",
  description: "What's Klink been up to?",
};

export default Resume;
`;
}

function generateReactComponent(markdown: string): string {
  // Parse the markdown
  const ast = Markdoc.parse(markdown);
  
  // Transform using the config
  const content = Markdoc.transform(ast, config);
  
  // Extract data from the transformed content
  const resumeData = extractResumeData(content);
  
  // Generate the React component code
  return generateComponentCode(resumeData);
}

// Main execution
const markdownPath = path.join(process.cwd(), "resume.markdoc.md");
const outputPath = path.join(process.cwd(), "src/app/resume/page.tsx");

if (!fs.existsSync(markdownPath)) {
  console.error(`❌ Error: ${markdownPath} not found!`);
  console.log("💡 Make sure resume.markdoc.md exists in the project root.");
  process.exit(1);
}

const markdown = fs.readFileSync(markdownPath, "utf-8");
const reactCode = generateReactComponent(markdown);

fs.writeFileSync(outputPath, reactCode, "utf-8");

console.log("✅ Successfully generated resume component from Markdoc markdown!");
console.log(`📄 Output: ${outputPath}`);
