import * as React from "react";
import styles from "./resume.module.scss";



// Helper function to process children and ensure lists use compactList
function processSkillsListChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    // If it's a List component, replace with compactList version
    if (child.type === "li") {
      const listProps = child.props as {
        children?: React.ReactNode;
      };
      return <>{listProps.children},</>;
    }

    // Recursively process children if element has children prop
    const childProps = child.props as { children?: React.ReactNode } & Record<
      string,
      unknown
    >;
    if (
      childProps &&
      typeof childProps === "object" &&
      "children" in childProps
    ) {
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

// Helper function to process nested lists and apply compactList to them
function processNestedLists(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    // If it's a List component, replace with compactList version
    if (child.type === List) {
      const listProps = child.props as {
        ordered?: boolean;
        children?: React.ReactNode;
      };
      const Component = listProps.ordered ? "ol" : "ul";
      return (
        <Component className={styles.compactList}>
          {processNestedLists(listProps.children)}
        </Component>
      );
    }

    // If it's a ul or ol element, add compactList class
    if (child.type === "ul" || child.type === "ol") {
      const listProps = child.props as React.HTMLAttributes<
        HTMLUListElement | HTMLOListElement
      >;
      const existingClass = listProps.className || "";
      const className = existingClass.includes(styles.compactList)
        ? existingClass
        : `${styles.compactList} ${existingClass}`.trim();
      const Component = child.type;
      return (
        <Component {...listProps} className={className}>
          {processNestedLists(listProps.children)}
        </Component>
      );
    }

    // Recursively process children if element has children prop
    const childProps = child.props as { children?: React.ReactNode } & Record<
      string,
      unknown
    >;
    if (
      childProps &&
      typeof childProps === "object" &&
      "children" in childProps
    ) {
      return React.cloneElement(
        child as React.ReactElement<{ children?: React.ReactNode }>,
        {
          ...childProps,
          children: processNestedLists(childProps.children),
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

  const formattedTitle = title?.toString().toUpperCase() + "\n";

  return (
    <>
      <>
        <>{formattedTitle}</>
        <>
          {start}
          {start && end && <> – </>}
          {end}
          {"\n"}
        </>
      </>
      <div className={styles.organization}>
        {organization}
        {url && <> ({url})</>}
        {"\n"}
      </div>
      <>
        {location}
        {"\n"}
      </>
      {children ? (
        <>
          {"\n"}
          {children}
          {"\n\n\n"}
        </>
      ) : (
        "\n\n"
      )}
    </>
  );
};

// BulletList component - default list styling
// Nested lists use compactList
export const BulletList: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const processedChildren = processNestedLists(children);
  return <>{processedChildren}</>;
};

// SkillsSection component - grid container for skills lists
export const SkillsSection: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  // Process children to ensure all lists use compactList (same as SkillsList did)
  const processedChildren = processSkillsListChildren(children);
  return <>{processedChildren}</>;
};

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
// Defaults to bulletList, but nested lists use compactList
export const List: React.FunctionComponent<{
  ordered?: boolean;
  children?: React.ReactNode;
}> = ({ ordered, children }) => {
  const Component = ordered ? "ol" : "ul";
  // Process children to apply compactList to nested lists
  const processedChildren = processNestedLists(children);
  return (
    <Component className={styles.bulletList}>{processedChildren}</Component>
  );
};
