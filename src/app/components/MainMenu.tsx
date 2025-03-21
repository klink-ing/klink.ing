import * as React from 'react';
import { Link } from 'gatsby';
import { StaticImage } from 'gatsby-plugin-image';
import Logo from './Logo';
import * as styles from './MainMenu.module.scss';

const MainMenu = () => (
  <nav className={styles.menu}>
    <a className={styles.logo} href="/">
      <Logo />
    </a>
        <a href="/resume">Resumé</a>
  </nav>
);

export default MainMenu;
