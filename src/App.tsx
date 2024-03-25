import { Router } from '@reach/router';
import React from 'react';

import { HomePage as MindaAnimationPage } from './pages/MindaAnimation';

import 'notyf/notyf.min.css';

function App() {
  return (
    <React.Fragment>
        <Router>
            <MindaAnimationPage default path="/" />
        </Router>
    </React.Fragment>
  );
}

export default App;
