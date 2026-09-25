import ControlPanel from './components/ControlPanel';
import Scene from './components/Scene';

function App() {
  return (
    <div className="app">
      <ControlPanel />
      <div className="scene-container">
        <Scene />
      </div>
    </div>
  );
}

export default App;
