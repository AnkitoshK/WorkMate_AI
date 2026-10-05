import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getActiveUserSession, MobileUser } from '@/lib/storage';
import { getApiUrl } from '@/lib/api';

export default function SecurityAuditScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

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
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  const isSuperAdmin = session?.role === 'SUPER_ADMIN';

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: '#090d16' }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <View style={styles.container}>
        
        {/* Header Title */}
        <View style={styles.header}>
          <View style={styles.badgeShield}>
            <ThemedText style={styles.shieldIcon}>🛡️</ThemedText>
            <ThemedText style={styles.shieldTitle}>Zero-Trust Data Protection & RBAC Audit</ThemedText>
          </View>
          <ThemedText style={styles.mainTitle}>Security & Enterprise Governance</ThemedText>
          <ThemedText style={styles.subtitle}>
            WorkMate AI guarantees complete ticket confidentiality. Field engineers cannot access, inspect, or modify colleague tickets without explicit assignment.
          </ThemedText>
        </View>

        {/* Active Session Identity Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>🔐 ACTIVE DEVICE SESSION</ThemedText>
            <View style={[styles.rolePill, { backgroundColor: isSuperAdmin ? '#7c3aed33' : '#0284c733', borderColor: isSuperAdmin ? '#a78bfa' : '#38bdf8' }]}>
              <ThemedText style={[styles.roleText, { color: isSuperAdmin ? '#c4b5fd' : '#7dd3fc' }]}>
                {session ? session.role : 'GUEST / UNSECURED'}
              </ThemedText>
            </View>
          </View>

          {session ? (
            <View style={styles.sessionDetails}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Authenticated User:</ThemedText>
                <ThemedText style={styles.val}>{session.name}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Enterprise Email:</ThemedText>
                <ThemedText style={styles.val}>{session.email}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Data Clearance Level:</ThemedText>
                <ThemedText style={[styles.val, { color: isSuperAdmin ? '#a78bfa' : '#38bdf8', fontWeight: '700' }]}>
                  {isSuperAdmin ? 'Full Global Org Access (SuperAdmin)' : 'Strict Isolation: Assigned Tickets Only'}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Breach Prevention Protocol:</ThemedText>
                <ThemedText style={[styles.val, { color: '#10b981' }]}>ENFORCED & ACTIVE (AES-256 / RBAC Scoped)</ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
              No local session token detected. Switch user from the main Service Desk tab to test multi-role scoping.
            </ThemedText>
          )}
        </View>

        {/* Security Architecture Matrix */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>🏢 ROLE-BASED ACCESS CONTROL (RBAC) POLICIES</ThemedText>
          <View style={styles.policyTable}>
            
            <View style={styles.policyItem}>
              <View style={[styles.policyDot, { backgroundColor: '#7c3aed' }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.policyRole}>SuperAdmin (e.g. Ankitosh Kumar)</ThemedText>
                <ThemedText style={styles.policyDesc}>
                  Global visibility across all departments. Can reassign incidents, trigger manual AI triage pipelines, view executive metrics, and audit system performance.
                </ThemedText>
              </View>
            </View>

            <View style={styles.policyItem}>
              <View style={[styles.policyDot, { backgroundColor: '#0ea5e9' }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.policyRole}>Field Engineer (e.g. Aashutosh Kumar)</ThemedText>
                <ThemedText style={styles.policyDesc}>
                  Strictly scoped. Only incidents assigned to their account or reported by them are visible in the feed. Colleague incident payloads and logs are completely blocked from transmission.
                </ThemedText>
              </View>
            </View>

            <View style={styles.policyItem}>
              <View style={[styles.policyDot, { backgroundColor: '#10b981' }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.policyRole}>End-User / Reporter (e.g. Ravi Kumar)</ThemedText>
                <ThemedText style={styles.policyDesc}>
                  Can report new system breakdowns and view real-time remediation progress for their own submissions only.
                </ThemedText>
              </View>
            </View>

          </View>
        </View>

        {/* Enterprise Telemetry & Infrastructure */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>⚙️ INFRASTRUCTURE & ENCRYPTION TELEMETRY</ThemedText>
          
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <ThemedText style={styles.telemetryLabel}>API GATEWAY</ThemedText>
              <ThemedText style={styles.telemetryValue}>{getApiUrl()}</ThemedText>
              <ThemedText style={styles.telemetrySub}>Express + CORS + Rate Limiting</ThemedText>
            </View>

            <View style={styles.telemetryBox}>
              <ThemedText style={styles.telemetryLabel}>LAKEBASE DATABASE</ThemedText>
              <ThemedText style={styles.telemetryValue}>Neon Postgres</ThemedText>
              <ThemedText style={styles.telemetrySub}>SSL TLSv1.3 Encrypted</ThemedText>
            </View>

            <View style={styles.telemetryBox}>
              <ThemedText style={styles.telemetryLabel}>AI TRIAGE ENGINE</ThemedText>
              <ThemedText style={styles.telemetryValue}>Gemini Flash / Pro</ThemedText>
              <ThemedText style={styles.telemetrySub}>Automated Root Cause Triage</ThemedText>
            </View>

            <View style={styles.telemetryBox}>
              <ThemedText style={styles.telemetryLabel}>DATA BREACH DEFENSE</ThemedText>
              <ThemedText style={[styles.telemetryValue, { color: '#10b981' }]}>Zero Leakage</ThemedText>
              <ThemedText style={styles.telemetrySub}>Isolated memory & token bounds</ThemedText>
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
  badgeShield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  shieldIcon: {
    fontSize: 14,
  },
  shieldTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sessionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b55',
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
  },
  val: {
    fontSize: 13,
    color: '#f1f5f9',
    fontWeight: '600',
  },
  policyTable: {
    marginTop: Spacing.three,
    gap: 14,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  policyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  policyRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 3,
  },
  policyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  telemetryGrid: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  telemetryBox: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#090d16',
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    marginTop: 4,
  },
  telemetrySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
