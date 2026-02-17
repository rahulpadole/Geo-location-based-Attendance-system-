export default function Footer() {
  return (
    <footer style={styles.footer}>
      <p>© {new Date().getFullYear()} Geo Attendance System. All rights reserved.</p>
    </footer>
  );
}

const styles = {
  footer: {
    textAlign: "center",
    padding: "20px 0",
    background: "#f0f0f0",
    width: "100%",
    // Yeh raha aapka top margin attribute
    marginTop: "50px", 
    borderTop: "1px solid #ddd",
    color: "#555"
  },
};