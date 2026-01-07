import * as React from "react";
import styles from "./resume.module.scss";

// Helper function to process children and ensure lists use compactList
function processSkillsListChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    // If it's a List component, replace with compactList version
    if (child.type === List) {
      const listProps = child.props as { ordered?: boolean; children?: React.ReactNode };
      const Component = listProps.ordered ? "ol" : "ul";
      return (
        <Component className={styles.compactList}>
          {processSkillsListChildren(listProps.children)}
        </Component>
      );
    }

    // If it's a ul element, add compactList class
    if (child.type === "ul") {
      const ulProps = child.props as React.HTMLAttributes<HTMLUListElement>;
      const existingClass = ulProps.className || "";
      const className = existingClass.includes(styles.compactList)
        ? existingClass
        : `${styles.compactList} ${existingClass}`.trim();
      return (
        <ul {...ulProps} className={className}>
          {processSkillsListChildren(ulProps.children)}
        </ul>
      );
    }

    // Recursively process children if element has children prop
    const childProps = child.props as { children?: React.ReactNode } & Record<string, unknown>;
    if (childProps && typeof childProps === "object" && "children" in childProps) {
      return React.cloneElement(
        child as React.ReactElement<{ children?: React.ReactNode }>,
        {
          ...childProps,
          children: processSkillsListChildren(childProps.children),
        }
      );
    }

    return child;
  });
}


// Stint component for job/education entries
export const Stint: React.FunctionComponent<{
  title: React.ReactNode;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
  children?: React.ReactNode;
  pageBreak?: boolean;
}> = ({
  title,
  start,
  end,
  location,
  organization,
  url,
  children,
  // pageBreak is used by parent section component, not here
}) => {
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

  const content = (
    <>
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
    </>
  );

  // Return content as-is - the parent section component will wrap in li
  return content;
};

// BulletList component - default list styling
export const BulletList: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => <ul className={styles.bulletList}>{children}</ul>;

// SkillsList component - compact list styling for Skills section
export const SkillsList: React.FunctionComponent<{
  children?: React.ReactNode;
  heading?: string;
}> = ({ children, heading }) => {
  // Process children to ensure all lists use compactList
  // The markdown already creates a <ul> from list items, so we just process children
  const processedChildren = processSkillsListChildren(children);

  return (
    <div className={styles.skillsListItem}>
      {heading && <h4>{heading}</h4>}
      {processedChildren}
    </div>
  );
};

// List component - handles regular markdown lists
// Defaults to bulletList (SkillsList will process its children to use compactList)
export const List: React.FunctionComponent<{
  ordered?: boolean;
  children?: React.ReactNode;
}> = ({ ordered, children }) => {
  const Component = ordered ? "ol" : "ul";
  // Default to bulletList - SkillsList will transform this if needed
  return <Component className={styles.bulletList}>{children}</Component>;
};
