import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreateFolder from "./components/CreateFolder";
import AccessFolder from "./components/AccessFolder";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreateFolder />} />
        <Route path="/access" element={<AccessFolder />} />
      </Routes>
    </Router>
  );
}

export default App;
