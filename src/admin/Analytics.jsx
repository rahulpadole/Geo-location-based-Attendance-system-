import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Card, Grid } from '../components/ResponsiveLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLLECTIONS } from '../constants';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeTeachers: 0,
    todayPresent: 0,
    todayLate: 0,
    weeklyAverage: 0,
    monthlyAverage: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load teacher stats
      const teachersQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('role', '==', 'teacher')
      );
      const teachersSnap = await getDocs(teachersQuery);
      const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const activeTeachers = teachers.filter(t => t.active !== false).length;
      
      // Load today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('date', '==', today)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const attendance = attendanceSnap.docs.map(d => d.data());
      
      const todayPresent = attendance.filter(a => a.status === 'Present').length;
      const todayLate = attendance.filter(a => a.status === 'Late').length;
      
      // Load weekly stats
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const weekQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('date', '>=', lastWeek.toISOString().split('T')[0])
      );
      const weekSnap = await getDocs(weekQuery);
      const weekAttendance = weekSnap.docs.map(d => d.data());
      
      const weeklyAverage = weekAttendance.length / 7;
      
      // Load monthly stats
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('date', '>=', lastMonth.toISOString().split('T')[0])
      );
      const monthSnap = await getDocs(monthQuery);
      const monthAttendance = monthSnap.docs.map(d => d.data());
      
      const monthlyAverage = monthAttendance.length / 30;
      
      setStats({
        totalTeachers: teachers.length,
        activeTeachers,
        todayPresent,
        todayLate,
        weeklyAverage: weeklyAverage.toFixed(1),
        monthlyAverage: monthlyAverage.toFixed(1)
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Analytics Dashboard</h2>
      
      <Grid columns={2} gap={20}>
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon="👥"
          color="#1976d2"
        />
        <StatCard
          title="Active Teachers"
          value={stats.activeTeachers}
          icon="✅"
          color="#2e7d32"
        />
        <StatCard
          title="Present Today"
          value={stats.todayPresent}
          icon="📋"
          color="#ed6c02"
        />
        <StatCard
          title="Late Today"
          value={stats.todayLate}
          icon="⏰"
          color="#d32f2f"
        />
      </Grid>
      
      <Grid columns={2} gap={20} style={styles.secondRow}>
        <Card padding={20}>
          <h3>Weekly Average Attendance</h3>
          <p style={styles.largeNumber}>{stats.weeklyAverage}</p>
        </Card>
        
        <Card padding={20}>
          <h3>Monthly Average Attendance</h3>
          <p style={styles.largeNumber}>{stats.monthlyAverage}</p>
        </Card>
      </Grid>
    </div>
  );
}

const StatCard = ({ title, value, icon, color }) => (
  <Card padding={20}>
    <div style={styles.statHeader}>
      <span style={styles.statIcon}>{icon}</span>
      <h3 style={{ ...styles.statTitle, color }}>{title}</h3>
    </div>
    <p style={styles.statValue}>{value}</p>
  </Card>
);

const styles = {
  container: {
    maxWidth: 1200,
    margin: '30px auto',
    padding: '0 20px'
  },
  title: {
    textAlign: 'center',
    marginBottom: 30
  },
  secondRow: {
    marginTop: 20
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10
  },
  statIcon: {
    fontSize: 24
  },
  statTitle: {
    margin: 0,
    fontSize: 16
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    margin: 0
  },
  largeNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    margin: '10px 0 0 0',
    color: '#1976d2'
  }
};