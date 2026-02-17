import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const MainLayout = ({ children }) => {
  return (
    <>
      <Navbar />

      <div style={{ minHeight: "80vh", padding: "20px" }}>
        {children}
      </div>

      <Footer />
    </>
  );
};

export default MainLayout;
