import { ReactNode } from "react";
import MainMenu from "../components/MainMenu";

const ResumePage = ({children}:{children:ReactNode}) => (
  <>
    <MainMenu />
    {children}
  </>
);

export default ResumePage;
