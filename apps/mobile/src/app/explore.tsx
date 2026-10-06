import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getActiveUserSession, MobileUser } from '@/lib/storage';
import { getApiUrl } from '@/lib/api';

export default function WorkspaceGuideScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const [session, setSession] = useState<MobileUser | null>(null);

  useEffect(() => {
    getActiveUserSession().then(setSession);
  }, []);

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.four,
      paddingBottom: Spacing.four,
    },
  });

  const isSuperAdmin = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN';

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: '#0b0f19' }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <View style={styles.container}>
        
        {/* Header Title */}
        <View style={styles.header}>
          <ThemedText style={styles.mainTitle}>Workspace & Roles Guide</ThemedText>
          <ThemedText style={styles.subtitle}>
            Understand how tickets, tasks, and team permissions work across your organization.
          </ThemedText>
        </View>

        {/* Active Session Identity Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>CURRENT PROFILE</ThemedText>
            <View style={[styles.rolePill, { backgroundColor: isSuperAdmin ? '#3b82f622' : '#10b98122', borderColor: isSuperAdmin ? '#3b82f6' : '#10b981' }]}>
              <ThemedText style={[styles.roleText, { color: isSuperAdmin ? '#60a5fa' : '#34d399' }]}>
                {session ? (isSuperAdmin ? 'Admin' : 'Engineer') : 'Not Signed In'}
              </ThemedText>
            </View>
          </View>

          {session ? (
            <View style={styles.sessionDetails}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Name:</ThemedText>
                <ThemedText style={styles.val}>{session.name}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Email:</ThemedText>
                <ThemedText style={styles.val}>{session.email}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Department:</ThemedText>
                <ThemedText style={styles.val}>{session.department || 'Engineering'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Access Scope:</ThemedText>
                <ThemedText style={[styles.val, { color: isSuperAdmin ? '#60a5fa' : '#94a3b8' }]}>
                  {isSuperAdmin ? 'Full Organization Visibility' : 'Personal & Assigned Tickets'}
                </ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText style={{ color: '#64748b', fontSize: 13 }}>
              Sign in from the Tickets tab to see your profile details and assigned work.
            </ThemedText>
          )}
        </View>

        {/* Roles & Permissions */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>TEAM ROLES & PERMISSIONS</ThemedText>
          <View style={styles.policyTable}>
            
            <View style={styles.policyItem}>
              <View style={[styles.policyDot, { backgroundColor: '#3b82f6' }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.policyRole}>Super Admin & Managers</ThemedText>
                <ThemedText style={styles.policyDesc}>
                  Full organization access. Can view all tickets across every squad, reassign work, create new team members, and view overall SLA health.
                </ThemedText>
              </View>
            </View>

            <View style={styles.policyItem}>
              <View style={[styles.policyDot, { backgroundColor: '#10b981' }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.policyRole}>Engineers & Specialists</ThemedText>
                <ThemedText style={styles.policyDesc}>
                  Focused workspace. Engineers see tickets assigned to them or reported by them, and their related checklist tasks.
                </ThemedText>
              </View>
            </View>

            <View style={styles.policyItem}>
              <View style={[styles.policyDot, { backgroundColor: '#f59e0b' }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.policyRole}>Team Members & Reporters</ThemedText>
                <ThemedText style={styles.policyDesc}>
                  Can submit new issue reports and track the status of tickets they have filed.
                </ThemedText>
              </View>
            </View>

          </View>
        </View>

        {/* How AI Triage Works */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>HOW AI ASSISTANCE WORKS</ThemedText>
          <ThemedText style={[styles.policyDesc, { marginTop: 6, lineHeight: 18 }]}>
            When a ticket is submitted with AI enabled, the assistant analyzes the title and symptoms to:
          </ThemedText>
          <View style={{ marginTop: 8, gap: 6 }}>
            <ThemedText style={styles.bulletItem}>• Suggest the most probable root cause</ThemedText>
            <ThemedText style={styles.bulletItem}>• Recommend specific troubleshooting steps</ThemedText>
            <ThemedText style={styles.bulletItem}>• Provide a diagnosis confidence score</ThemedText>
          </View>
        </View>

        {/* System Connection Details */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>SYSTEM CONNECTION</ThemedText>
          
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <ThemedText style={styles.telemetryLabel}>API ENDPOINT</ThemedText>
              <ThemedText style={styles.telemetryValue} numberOfLines={1}>{getApiUrl()}</ThemedText>
              <ThemedText style={styles.telemetrySub}>Node / Express Server</ThemedText>
            </View>

            <View style={styles.telemetryBox}>
              <ThemedText style={styles.telemetryLabel}>DATABASE</ThemedText>
              <ThemedText style={styles.telemetryValue}>Postgres (Prisma)</ThemedText>
              <ThemedText style={styles.telemetrySub}>Neon Cloud Postgres</ThemedText>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    marginBottom: Spacing.two,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderColor: '#1e293b',
    borderWidth: 1,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sessionDetails: {
    gap: 6,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
  },
  val: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600',
  },
  policyTable: {
    marginTop: Spacing.two,
    gap: 12,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  policyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  policyRole: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  policyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  bulletItem: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  telemetryGrid: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  telemetryBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#0b0f19',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 4,
  },
  telemetrySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
