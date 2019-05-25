import React from 'react';
import {
 BrowserRouter as Router, Route, Link, Redirect, Switch,
} from 'react-router-dom';
import styled from 'styled-components';
import GlobalStyles from './globalStyles';
import Basic from './pages/Basic';
import Signal from './pages/Signal';

const AppStyled = styled.div`
  display: flex;
  position: relative;
  max-width: 80%;
  max-height: 100%;
  margin: auto;
  flex-basis: 576px;
  width: 100%;

  .menu {
    min-width: 200px;
    padding: 0 20px;
  }

  .content {
    background-color: #eeeeee;
    width: 100%;
    max-height: 100%;

    > * {
      height: 100%;
    }
  }
`;

export default function App() {
  return (
    <Router>
      <AppStyled>
        <GlobalStyles />

        <div className="menu">
          <h1>Examples</h1>
          <ul>
            <li>
              <Link to="/basic/">Basic Example</Link>
            </li>
            <li>
              <Link to="/signal/">Signal Example</Link>
            </li>
          </ul>
        </div>

        <div className="content">
          <Switch>
            <Redirect exact from="/" to="/basic/" />
            <Route path="/basic/" component={Basic} />
            <Route path="/signal/" component={Signal} />
          </Switch>
        </div>
      </AppStyled>
    </Router>
  );
}
