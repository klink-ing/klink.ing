import * as React from "react";
import styles from "./resume.module.css";

// Stint component for job/education entries
export const Stint: React.FunctionComponent<{
  title: React.ReactNode;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, start, end, location, organization, url, className, children }) => {
  // Handle special title formatting for education entries
  const formattedTitle =
    typeof title === "string" && title.includes(" in ") ? (
      <>
        {title.split(" in ")[0]} in{" "}
        <span style={{ whiteSpace: "nowrap" }}>{title.split(" in ")[1]}</span>
      </>
    ) : (
      title
    );

  const hasChildren = React.Children.count(children) > 0;
  const baseClassName = hasChildren ? styles.stint : `${styles.stint} ${styles.noChildren}`.trim();
  const stintClassName = className ? `${baseClassName} ${className}` : baseClassName;

  const content = (
    <div className={stintClassName}>
      <div className={styles.topLine}>
        <h3 className={styles.jobTitle}>{formattedTitle}</h3>
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
    </div>
  );

  // Return content as-is - the parent section component will wrap in li
  return content;
};

// SkillsSection component - grid container for skills lists
export const SkillsSection: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return <div className={styles.skillsSection}>{children}</div>;
};

// List component - handles regular markdown lists
// Uses compactList if within a skillsSection, otherwise uses bulletList
export const List: React.FunctionComponent<{
  ordered?: boolean;
  listType?: "bullet" | "compact";
  children?: React.ReactNode;
  parentTags?: string;
}> = ({ children, listType = "bullet", ordered = false }) => {
  const Component = ordered ? "ol" : "ul";

  // Use compactList if within skillsSection, otherwise use bulletList
  const className = listType === "compact" ? styles.compactList : styles.bulletList;

  return <Component className={className}>{children}</Component>;
};

// PageBreak - renders an empty div with the .pageBreak class
export const PageBreak: React.FunctionComponent = () => (
  <div aria-hidden="true" className={styles.pageBreak} />
);

// NoBreak component - inline span that prevents line breaks within its content.
export const NoBreak: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
  <span className={styles.noBreak}>{children}</span>
);

const NO_BREAK_PATTERN = /\d+–\d+/g;

function wrapStringWithNoBreaks(value: string): React.ReactNode {
  if (!NO_BREAK_PATTERN.test(value)) {
    return value;
  }
  NO_BREAK_PATTERN.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = NO_BREAK_PATTERN.exec(value);
  let key = 0;
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(value.slice(lastIndex, match.index));
    }
    parts.push(<NoBreak key={`nb-${key++}`}>{match[0]}</NoBreak>);
    lastIndex = match.index + match[0].length;
    match = NO_BREAK_PATTERN.exec(value);
  }
  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }
  return parts;
}

// Walks the rendered React tree and wraps text matching {digits}–{digits}
// in NoBreak spans so the range stays on one line.
export function wrapNoBreaks(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    return wrapStringWithNoBreaks(node);
  }
  if (Array.isArray(node)) {
    return node.map(wrapNoBreaks);
  }
  if (!React.isValidElement(node)) {
    return node;
  }
  if (node.type === NoBreak) {
    return node;
  }
  const props = node.props as { children?: React.ReactNode };
  if (props.children === undefined || props.children === null) {
    return node;
  }
  const newChildren = React.Children.map(props.children, wrapNoBreaks);
  return React.cloneElement(node, undefined, newChildren);
}

export const Intro = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return <p className={`${styles.intro}${className ? ` ${className}` : ""}`}>{children}</p>;
};
