import { createGlobalStyle } from 'styled-components';

export default createGlobalStyle`
  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
  }

  #root {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  h1, h2 {
    margin-top: 0;
  }
`;
