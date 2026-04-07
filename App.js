import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import ApplyLeave from "./components/ApplyLeave";
import LeaveHistory from "./components/LeaveHistory";
import Approval from "./components/Approval";

function App() {
  const [user, setUser] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!user ? <Login setUser={setUser} /> : <Navigate to={user.role === "Admin" ? "/admin" : "/apply"} />} />
        <Route path="/apply" element={<ApplyLeave setUser={setUser} />} />
        <Route path="/history" element={<LeaveHistory setUser={setUser} />} />
        <Route path="/admin" element={<Approval setUser={setUser} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;