import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import Login from "./Login";
import Dashboard from "./Dashboard";




function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      console.log(user)
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!user) {
    return <Login />;
  } 
  return <Dashboard/>;
}

export default App;