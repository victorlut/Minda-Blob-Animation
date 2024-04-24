import { Router } from '@reach/router';
import React from 'react';

import { HomePage as MindaAnimationPage } from './pages/MindaAnimation';

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
