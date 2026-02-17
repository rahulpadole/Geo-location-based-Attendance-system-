import { useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from '../components/LoadingSpinner';
import { ATTENDANCE_STATUS } from '../constants';

export default function Export() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState(null); // 'excel', 'pdf', 'summary'
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    department: "",
    status: "",
    teacherName: ""
  });
  
  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadAttendance = async () => {
    if (!filters.fromDate || !filters.toDate) {
      showToast("Please select date range", "error");
      return;
    }

    setLoading(true);
    try {
      // Check if date range is valid
      if (filters.fromDate > filters.toDate) {
        showToast("From date cannot be after to date", "error");
        setLoading(false);
        return;
      }

      let q = query(
        collection(db, "attendance"),
        where("date", ">=", filters.fromDate),
        where("date", "<=", filters.toDate),
        orderBy("date", "asc")
      );

      let snap = await getDocs(q);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Apply filters
      if (filters.department) {
        list = list.filter(r => r.department === filters.department);
      }
      
      if (filters.status) {
        list = list.filter(r => r.status === filters.status);
      }
      
      if (filters.teacherName) {
        const searchTerm = filters.teacherName.toLowerCase();
        list = list.filter(r => 
          (r.userName || '').toLowerCase().includes(searchTerm) ||
          (r.userId || '').toLowerCase().includes(searchTerm)
        );
      }
      
      setRecords(list);
      
      if (list.length === 0) {
        showToast("No records found for selected filters", "info");
      } else {
        showToast(`Found ${list.length} records`, "success");
      }
    } catch (err) {
      console.error(err);
      
      // Handle missing index error
      if (err.message.includes('index')) {
        showToast("Database index required. Please try a smaller date range or contact admin.", "error");
      } else {
        showToast("Error loading records: " + err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTimeForDisplay = (timestamp) => {
    if (!timestamp) return "-";
    
    try {
      if (timestamp?.toDate) {
        // Firebase Timestamp
        return timestamp.toDate().toLocaleTimeString();
      } else if (timestamp instanceof Date) {
        // JavaScript Date
        return timestamp.toLocaleTimeString();
      } else if (typeof timestamp === 'string') {
        // ISO string
        return new Date(timestamp).toLocaleTimeString();
      }
      return timestamp.toString();
    } catch (e) {
      return "-";
    }
  };

  const exportExcel = () => {
    if (!records.length) {
      showToast("No records to export", "error");
      return;
    }

    setExporting(true);
    setExportType('excel');
    
    try {
      const cleanData = records.map(r => ({
        'Date': formatDateForDisplay(r.date),
        'Teacher Name': r.userName || r.userId || "Unknown",
        'Department': r.department || "-",
        'In Time': formatTimeForDisplay(r.inTime),
        'Out Time': formatTimeForDisplay(r.outTime),
        'Status': r.status || "Present",
        'Late Reason': r.lateReason || "-",
        'In Distance': r.inLocation?.distance ? `${r.inLocation.distance.toFixed(1)}m` : "-",
        'Out Distance': r.outLocation?.distance ? `${r.outLocation.distance.toFixed(1)}m` : "-",
      }));

      const ws = XLSX.utils.json_to_sheet(cleanData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      
      const fileName = `attendance_${filters.fromDate}_to_${filters.toDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showToast("Excel exported successfully", "success");
    } catch (error) {
      console.error("Excel export error:", error);
      showToast("Error exporting Excel: " + error.message, "error");
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const exportPDF = () => {
    if (!records.length) {
      showToast("No records to export", "error");
      return;
    }

    setExporting(true);
    setExportType('pdf');
    
    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(25, 118, 210);
      doc.text('Attendance Report', 14, 15);
      
      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Period: ${filters.fromDate} to ${filters.toDate}`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
      
      // Add filters info
      let filterText = 'Filters: ';
      const filterParts = [];
      if (filters.department) filterParts.push(`Dept: ${filters.department}`);
      if (filters.status) filterParts.push(`Status: ${filters.status}`);
      if (filters.teacherName) filterParts.push(`Teacher: ${filters.teacherName}`);
      
      doc.text(filterParts.length > 0 ? filterText + filterParts.join(', ') : 'Filters: None', 14, 32);
      
      // Prepare table data
      const tableData = records.map(r => [
        r.date || '-',
        (r.userName || r.userId || "Unknown").substring(0, 20),
        (r.department || "-").substring(0, 10),
        formatTimeForDisplay(r.inTime),
        formatTimeForDisplay(r.outTime),
        r.status || "-",
        (r.lateReason || "-").substring(0, 20),
      ]);

      // Generate table
      autoTable(doc, {
        head: [['Date', 'Teacher', 'Dept', 'In Time', 'Out Time', 'Status', 'Late Reason']],
        body: tableData,
        startY: 40,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: { 
          fillColor: [25, 118, 210],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 15 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 35 }
        },
        margin: { left: 10, right: 10 },
        didDrawPage: function(data) {
          // Add footer on each page
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${data.pageNumber} of ${data.pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 5
          );
        }
      });

      // Add summary
      const finalY = doc.lastAutoTable.finalY + 10;
      
      // Summary box
      doc.setFillColor(240, 240, 240);
      doc.rect(14, finalY, 180, 25, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 18, finalY + 7);
      
      const present = records.filter(r => r.status === 'Present').length;
      const late = records.filter(r => r.status === 'Late').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      const halfDay = records.filter(r => r.status === 'Half Day').length;
      const leave = records.filter(r => r.status === 'Leave').length;
      
      doc.setFontSize(9);
      doc.text(`Total Records: ${records.length}`, 18, finalY + 12);
      doc.text(`Present: ${present} | Late: ${late} | Absent: ${absent}`, 18, finalY + 17);
      doc.text(`Half Day: ${halfDay} | Leave: ${leave}`, 18, finalY + 22);
      
      // Add attendance rate
      const attendanceRate = ((present + late) / records.length * 100).toFixed(1);
      doc.setFontSize(10);
      doc.setTextColor(25, 118, 210);
      doc.text(`Attendance Rate: ${attendanceRate}%`, 120, finalY + 17);
      
      const fileName = `attendance_${filters.fromDate}_to_${filters.toDate}.pdf`;
      doc.save(fileName);
      
      showToast("PDF exported successfully", "success");
    } catch (error) {
      console.error("PDF export error:", error);
      showToast("Error exporting PDF: " + error.message, "error");
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const exportSummary = () => {
    if (!records.length) {
      showToast("No records to export", "error");
      return;
    }
    
    setExporting(true);
    setExportType('summary');
    
    try {
      // Group by department
      const deptSummary = {};
      records.forEach(r => {
        const dept = r.department || 'Unknown';
        if (!deptSummary[dept]) {
          deptSummary[dept] = { total: 0, present: 0, late: 0, absent: 0, halfDay: 0, leave: 0 };
        }
        deptSummary[dept].total++;
        
        switch(r.status) {
          case 'Present':
            deptSummary[dept].present++;
            break;
          case 'Late':
            deptSummary[dept].late++;
            break;
          case 'Absent':
            deptSummary[dept].absent++;
            break;
          case 'Half Day':
            deptSummary[dept].halfDay++;
            break;
          case 'Leave':
            deptSummary[dept].leave++;
            break;
        }
      });
      
      const summaryData = Object.entries(deptSummary).map(([dept, stats]) => ({
        'Department': dept,
        'Total Teachers': stats.total,
        'Present': stats.present,
        'Late': stats.late,
        'Absent': stats.absent,
        'Half Day': stats.halfDay,
        'Leave': stats.leave,
        'Attendance %': ((stats.present + stats.late) / stats.total * 100).toFixed(1) + '%'
      }));
      
      // Add overall summary
      const total = records.length;
      const present = records.filter(r => r.status === 'Present').length;
      const late = records.filter(r => r.status === 'Late').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      const halfDay = records.filter(r => r.status === 'Half Day').length;
      const leave = records.filter(r => r.status === 'Leave').length;
      
      summaryData.push({
        'Department': 'TOTAL',
        'Total Teachers': total,
        'Present': present,
        'Late': late,
        'Absent': absent,
        'Half Day': halfDay,
        'Leave': leave,
        'Attendance %': ((present + late) / total * 100).toFixed(1) + '%'
      });
      
      const ws = XLSX.utils.json_to_sheet(summaryData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Summary");
      
      const fileName = `attendance_summary_${filters.fromDate}_to_${filters.toDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showToast("Summary exported successfully", "success");
    } catch (error) {
      console.error("Summary export error:", error);
      showToast("Error exporting summary: " + error.message, "error");
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const getButtonText = (type) => {
    if (exporting && exportType === type) {
      return <LoadingSpinner size="small" />;
    }
    switch(type) {
      case 'excel': return '📊 Export Excel';
      case 'pdf': return '📄 Export PDF';
      case 'summary': return '📈 Export Summary';
      default: return '';
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back
      </button>
      
      <h2 style={styles.title}>Export Attendance Data</h2>

      <div style={styles.filterCard}>
        <h3 style={styles.subtitle}>Filter Records</h3>
        
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label>From Date *</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
              style={styles.input}
              max={filters.toDate || undefined}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <label>To Date *</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({...filters, toDate: e.target.value})}
              style={styles.input}
              min={filters.fromDate || undefined}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <label>Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              style={styles.input}
            >
              <option value="">All Departments</option>
              <option value="CS">Computer Science</option>
              <option value="IT">Information Technology</option>
              <option value="ME">Mechanical</option>
              <option value="EE">Electrical</option>
              <option value="CE">Civil</option>
              <option value="EC">Electronics</option>
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={styles.input}
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
          
          <div style={{...styles.filterGroup, gridColumn: 'span 2'}}>
            <label>Teacher Name/ID</label>
            <input
              type="text"
              placeholder="Search by teacher name or ID"
              value={filters.teacherName}
              onChange={(e) => setFilters({...filters, teacherName: e.target.value})}
              style={styles.input}
            />
          </div>
        </div>
        
        <button
          onClick={loadAttendance}
          disabled={loading}
          style={styles.loadButton}
        >
          {loading ? <LoadingSpinner size="small" /> : '📋 Load Records'}
        </button>
      </div>

      {records.length > 0 && (
        <div style={styles.exportCard}>
          <div style={styles.statsBar}>
            <span>📊 Total: <strong>{records.length}</strong></span>
            <span style={{color: '#2e7d32'}}>✅ Present: <strong>{records.filter(r => r.status === 'Present').length}</strong></span>
            <span style={{color: '#ed6c02'}}>⏰ Late: <strong>{records.filter(r => r.status === 'Late').length}</strong></span>
            <span style={{color: '#d32f2f'}}>❌ Absent: <strong>{records.filter(r => r.status === 'Absent').length}</strong></span>
            <span style={{color: '#1976d2'}}>📅 Half Day: <strong>{records.filter(r => r.status === 'Half Day').length}</strong></span>
            <span style={{color: '#9c27b0'}}>✈️ Leave: <strong>{records.filter(r => r.status === 'Leave').length}</strong></span>
          </div>
          
          <div style={styles.buttonGroup}>
            <button
              onClick={exportExcel}
              disabled={exporting}
              style={{...styles.exportButton, backgroundColor: '#1e6f3f'}}
            >
              {getButtonText('excel')}
            </button>
            
            <button
              onClick={exportPDF}
              disabled={exporting}
              style={{...styles.exportButton, backgroundColor: '#d32f2f'}}
            >
              {getButtonText('pdf')}
            </button>
            
            <button
              onClick={exportSummary}
              disabled={exporting}
              style={{...styles.exportButton, backgroundColor: '#ed6c02'}}
            >
              {getButtonText('summary')}
            </button>
          </div>
        </div>
      )}

      {records.length > 0 ? (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Teacher</th>
                <th style={styles.th}>Dept</th>
                <th style={styles.th}>In Time</th>
                <th style={styles.th}>Out Time</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Late Reason</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>{formatDateForDisplay(r.date)}</td>
                  <td style={styles.td}>{r.userName || r.userId || "Unknown"}</td>
                  <td style={styles.td}>{r.department || "-"}</td>
                  <td style={styles.td}>{formatTimeForDisplay(r.inTime)}</td>
                  <td style={styles.td}>{formatTimeForDisplay(r.outTime)}</td>
                  <td style={{
                    ...styles.td,
                    ...getStatusStyle(r.status)
                  }}>
                    {r.status || "-"}
                  </td>
                  <td style={styles.td}>{r.lateReason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📊</p>
            <h3 style={styles.emptyTitle}>No Records Found</h3>
            <p style={styles.emptyMessage}>Select a date range and click "Load Records" to view data.</p>
          </div>
        )
      )}
    </div>
  );
}

// Helper function for status styles
const getStatusStyle = (status) => {
  switch(status) {
    case 'Present':
      return { color: '#2e7d32', fontWeight: 'bold' };
    case 'Late':
      return { color: '#ed6c02', fontWeight: 'bold' };
    case 'Absent':
      return { color: '#d32f2f', fontWeight: 'bold' };
    case 'Half Day':
      return { color: '#1976d2', fontWeight: 'bold' };
    case 'Leave':
      return { color: '#9c27b0', fontWeight: 'bold' };
    default:
      return {};
  }
};

const styles = {
  container: {
    maxWidth: 1200,
    margin: "30px auto",
    padding: "0 20px"
  },
  backButton: {
    padding: "8px 16px",
    marginBottom: 20,
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f9f9f9",
    fontSize: 14,
    ':hover': {
      background: '#e9e9e9'
    }
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
    color: '#333'
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 20,
    color: '#555'
  },
  filterCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    marginBottom: 20
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 15,
    marginBottom: 20
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column"
  },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    marginTop: 5,
    fontSize: 14,
    fontFamily: 'inherit'
  },
  loadButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
    ':hover': {
      backgroundColor: '#1565c0'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  exportCard: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  statsBar: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: 20,
    padding: "15px",
    backgroundColor: "#fff",
    borderRadius: 8,
    flexWrap: "wrap",
    gap: "10px"
  },
  buttonGroup: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap"
  },
  exportButton: {
    padding: "12px 24px",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 160,
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 0.9
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  tableContainer: {
    overflowX: "auto",
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    marginTop: 20
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 800
  },
  th: {
    padding: "15px 12px",
    backgroundColor: "#f4f4f4",
    fontWeight: "bold",
    textAlign: "center",
    borderBottom: "2px solid #ddd"
  },
  tr: {
    borderBottom: "1px solid #eee",
    ':hover': {
      backgroundColor: '#f9f9f9'
    }
  },
  td: {
    padding: "12px",
    textAlign: "center",
    verticalAlign: "middle"
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    color: "#666"
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
    opacity: 0.5
  },
  emptyTitle: {
    marginBottom: 10,
    color: '#333'
  },
  emptyMessage: {
    color: '#999'
  }
};