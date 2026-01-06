import * as React from "react";
import styles from "./resume.module.scss";

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
}> = ({ title, start, end, location, organization, url, children, pageBreak }) => {
  // Handle special title formatting for education entries
  const formattedTitle = typeof title === "string" && title.includes(" in ") ? (
    <>
      {title.split(" in ")[0]} in{" "}
      <span style={{ whiteSpace: "nowrap" }}>{title.split(" in ")[1]}</span>
    </>
  ) : title;

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
}> = ({ children }) => (
  <ul className={styles.bulletList}>{children}</ul>
);

// CompactList component - compact list styling for Skills section
export const CompactList: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => (
  <ul className={styles.compactList}>{children}</ul>
);

// List component - handles regular markdown lists
// Defaults to bulletList unless inside a compactList tag
export const List: React.FunctionComponent<{
  ordered?: boolean;
  children?: React.ReactNode;
}> = ({ ordered, children }) => {
  const Component = ordered ? "ol" : "ul";
  // Default to bulletList className for regular lists
  return <Component className={styles.bulletList}>{children}</Component>;
};

