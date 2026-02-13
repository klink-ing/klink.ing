import type { ReactNode } from "react";

const ResumePage = ({ children }: { children: ReactNode }) => (
  <pre style={{ whiteSpace: "pre-wrap" }}>{children}</pre>
);

export default ResumePage;
