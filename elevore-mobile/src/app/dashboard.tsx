import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Linking, Switch } from 'react-native';
import { supabase } from '../supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenantName, setTenantName] = useState('ELEVORE EMPIRE');
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Shift state
  const [onDuty, setOnDuty] = useState(false);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  
  // Modal detail state
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [checklist, setChecklist] = useState<{[key: string]: boolean}>({
    'Cocina e Insumos': false,
    'Baños y Espejos': false,
    'Habitaciones y Tendidos': false,
    'Pisos y Aspirado': false,
    'Inspección Final de Calidad': false,
  });

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      // 1. Check Supabase Auth (CEO)
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      let currentName = '';
      let currentTenantId = '';
      
      if (authSession) {
        setSession(authSession);
        const adminProfile = {
          name: authSession.user.user_metadata.name || 'Admin',
          role: authSession.user.user_metadata.role || 'admin',
          tenant_id: authSession.user.user_metadata.tenant_id,
        };
        setProfile(adminProfile);
        currentName = adminProfile.name;
        currentTenantId = adminProfile.tenant_id;
        
        // Load settings to get company name
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('business_name')
          .eq('id', currentTenantId)
          .maybeSingle();
        if (tenantData) setTenantName(tenantData.business_name);
        
        // Admins don't have wallet balances in profiles
        setWalletBalance(0);
        setTotalEarned(0);
      } else {
        // 2. Check AsyncStorage (Staff PIN Login)
        const storedProfile = await AsyncStorage.getItem('elevore_staff_profile');
        const storedTenantName = await AsyncStorage.getItem('elevore_tenant_name');
        
        if (storedProfile) {
          const staffProfile = JSON.parse(storedProfile);
          setProfile(staffProfile);
          currentName = staffProfile.name;
          currentTenantId = staffProfile.tenant_id;
          
          if (storedTenantName) setTenantName(storedTenantName);
          
          // Set wallet balance from database profile directly
          await refreshStaffBalance(staffProfile.id);
        } else {
          // No session or profile - redirect to login
          router.replace('/');
          return;
        }
      }

      // Load shift status
      const shift = await AsyncStorage.getItem('elevore_staff_onduty');
      setOnDuty(shift === 'true');

      // Fetch missions
      if (currentName && currentTenantId) {
        await fetchMissions(currentName, currentTenantId);
      }
      setLoading(false);
    }
    
    loadUserData();
  }, []);

  // Simulated GPS Broadcaster when onDuty is active
  useEffect(() => {
    if (!onDuty || !profile?.id || !profile?.tenant_id) return;

    let timer: NodeJS.Timeout;
    
    // Orlando coordinates base
    let lat = 28.5383 + (Math.random() - 0.5) * 0.01;
    let lng = -81.3792 + (Math.random() - 0.5) * 0.01;

    async function broadcastLocation() {
      try {
        // Increment/move coordinates slightly to simulate driving
        lat += (Math.random() - 0.5) * 0.0008;
        lng += (Math.random() - 0.5) * 0.0008;

        const { error } = await supabase
          .from('crew_locations')
          .upsert({
            staff_id: profile.id,
            tenant_id: profile.tenant_id,
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            updated_at: new Date().toISOString()
          }, { onConflict: 'staff_id' });

        if (error) {
          console.warn('[GPS Broadcaster]: Upsert failed:', error.message);
        } else {
          console.log('[GPS Broadcaster]: Broadcasted coordinates:', lat, lng);
        }
      } catch (err) {
        console.warn('[GPS Broadcaster]: Error broadcasting:', err);
      }
    }

    // Run immediately
    broadcastLocation();

    // Loop every 15 seconds
    timer = setInterval(broadcastLocation, 15000);

    return () => {
      clearInterval(timer);
    };
  }, [onDuty, profile?.id, profile?.tenant_id]);

  const refreshStaffBalance = async (staffId: string) => {
    try {
      const { data: latestProfile } = await supabase
        .from('staff_profiles')
        .select('wallet_balance, total_earned')
        .eq('id', staffId)
        .maybeSingle();
      
      if (latestProfile) {
        setWalletBalance(latestProfile.wallet_balance || 0);
        setTotalEarned(latestProfile.total_earned || 0);
      }
    } catch (err) {
      console.warn('Could not refresh staff balance:', err);
    }
  };

  const fetchMissions = async (workerName: string, tenantId: string) => {
    try {
      // Query elevore_missions table (SaaS table)
      const { data: mData, error: mError } = await supabase
        .from('elevore_missions')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('team_assigned', `%${workerName}%`)
        .order('scheduled_date', { ascending: true });
        
      if (mError) throw mError;
      if (mData) setJobs(mData);
    } catch (err) {
      console.warn('Error fetching missions from Supabase:', err);
    }
  };

  const handleToggleDuty = async (value: boolean) => {
    setOnDuty(value);
    await AsyncStorage.setItem('elevore_staff_onduty', String(value));
    Alert.alert(
      value ? 'Shift Iniciado 👷' : 'Shift Terminado 👋',
      value ? 'Tu estado ha cambiado a ACTIVO para recibir misiones.' : 'Tu estado ha cambiado a FUERA DE SERVICIO.'
    );
  };

  const handleCashout = async () => {
    if (walletBalance <= 0) {
      Alert.alert('Saldo Insuficiente', 'No tienes saldo pendiente de pago para retirar.');
      return;
    }

    Alert.alert(
      '💸 Confirmar Retiro Zelle',
      `¿Deseas retirar tu saldo disponible de $${walletBalance.toFixed(2)} USD a tu cuenta de Zelle registrada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Retirar',
          onPress: async () => {
            setLoading(true);
            try {
              if (profile && profile.id) {
                // Update balance to 0 in Supabase staff_profiles
                const { error } = await supabase
                  .from('staff_profiles')
                  .update({ wallet_balance: 0 })
                  .eq('id', profile.id);
                
                if (error) throw error;
                
                // Add a mock payout record or log
                await refreshStaffBalance(profile.id);
                Alert.alert('¡Éxito!', 'Tu transferencia Zelle se está procesando. El dinero llegará en unos minutos.');
              }
            } catch (err) {
              console.error('Error during Zelle Cashout:', err);
              Alert.alert('Error', 'No se pudo procesar tu retiro. Contacta al administrador.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleOpenMap = (address: string) => {
    const query = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://app?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      }
    });
  };

  const startMission = async (job: any) => {
    try {
      const { error } = await supabase
        .from('elevore_missions')
        .update({ status: 'in_progress' })
        .eq('id', job.id);

      if (error) throw error;
      
      // Update local state
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'in_progress' } : j));
      setSelectedJob({ ...job, status: 'in_progress' });
      Alert.alert('Misión Iniciada 🚀', '¡Buen trabajo! Abre el mapa de ruta y recuerda hacer check-in.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar la misión.');
    }
  };

  const completeMission = async (job: any) => {
    Alert.alert(
      '✅ Finalizar Misión',
      '¿Confirmas que has completado todas las tareas de limpieza e inspección de calidad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Completado',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('elevore_missions')
                .update({ status: 'completed' })
                .eq('id', job.id);

              if (error) throw error;
              
              // If staff profile is available, give a payout commission (simulated XP/Reward)
              if (profile && profile.id) {
                // Fetch current job price to calculate commission (e.g. 15% payout pct)
                const commission = (job.total_price || 0) * ((profile.payout_pct || 15) / 100);
                
                // Add to balance
                const { error: profileErr } = await supabase
                  .from('staff_profiles')
                  .update({
                    wallet_balance: walletBalance + commission,
                    total_earned: totalEarned + commission
                  })
                  .eq('id', profile.id);
                  
                if (!profileErr) {
                  await refreshStaffBalance(profile.id);
                }
              }

              // Update local lists
              if (profile) {
                await fetchMissions(profile.name, profile.tenant_id);
              }
              setSelectedJob(null);
              Alert.alert('🎉 ¡Trabajo Completado!', 'Has cerrado la misión con éxito. Tus ganancias han sido añadidas.');
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'No se pudo completar la misión.');
            }
          }
        }
      ]
    );
  };

  const toggleChecklistItem = (item: string) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('elevore_staff_profile');
    await AsyncStorage.removeItem('elevore_tenant_name');
    await AsyncStorage.removeItem('elevore_staff_onduty');
    router.replace('/');
  }

  const renderJobCard = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'completed' || item.status === 'paid';
    const isInProgress = item.status === 'in_progress';
    
    return (
      <TouchableOpacity 
        style={[styles.jobCard, isInProgress && styles.jobCardActive]}
        onPress={() => {
          setSelectedJob(item);
          // Reset checklist
          setChecklist({
            'Cocina e Insumos': false,
            'Baños y Espejos': false,
            'Habitaciones y Tendidos': false,
            'Pisos y Aspirado': false,
            'Inspección Final de Calidad': false,
          });
        }}
      >
        <View style={styles.jobHeader}>
          <View>
            <Text style={styles.clientName}>{item.client_name}</Text>
            <Text style={styles.serviceType}>{item.service_type || 'Limpieza Regular'}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            isCompleted && styles.statusBadgeCompleted,
            isInProgress && styles.statusBadgeActive
          ]}>
            <Text style={[
              styles.statusText,
              isCompleted && styles.statusTextCompleted,
              isInProgress && styles.statusTextActive
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>📍</Text>
            <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>📅</Text>
            <Text style={styles.infoText}>{item.scheduled_date}</Text>
          </View>
        </View>

        <View style={styles.actionPromptRow}>
          <Text style={styles.actionPromptText}>
            {isInProgress ? 'Continuar misión ➜' : isCompleted ? 'Ver resumen ✓' : 'Iniciar misión ➜'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HUD HEADER */}
      <View style={styles.headerHud}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name || 'ST').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.hudTitle}>DECK DE OPERACIONES</Text>
            <Text style={styles.hudSub}>
              {profile?.name} • <Text style={styles.goldText}>{profile?.role?.toUpperCase() || 'STAFF'}</Text>
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>SALIR</Text>
        </TouchableOpacity>
      </View>

      {/* SHIFT & WALLET SECTION */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Shift Controller */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftHeader}>
            <View>
              <Text style={styles.shiftTitle}>TURNO DE DESPACHO</Text>
              <Text style={[styles.shiftStatusText, onDuty ? styles.greenText : styles.redText]}>
                {onDuty ? '● ACTIVO PARA TRABAJOS' : '○ FUERA DE SERVICIO'}
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#475569', true: '#059669' }}
              thumbColor={onDuty ? '#F5C518' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={handleToggleDuty}
              value={onDuty}
            />
          </View>
        </View>

        {/* Holographic Wallet Card */}
        {profile?.role === 'staff' && (
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletTitle}>BILLETERA ELEVORE</Text>
              <Text style={styles.walletSystemStatus}>LEDO PAYOUT SYSTEM</Text>
            </View>
            
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Saldo Pendiente</Text>
              <Text style={styles.balanceValue}>${walletBalance.toFixed(2)}</Text>
              <Text style={styles.totalEarnedText}>Acumulado Histórico: ${totalEarned.toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.cashoutBtn, walletBalance <= 0 && styles.cashoutBtnDisabled]} 
              onPress={handleCashout}
              disabled={walletBalance <= 0}
            >
              <Text style={styles.cashoutBtnText}>💸 RETIRO A ZELLE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AGENDA DE MISIONES */}
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>📋 MIS MISIONES ASIGNADAS</Text>
          <Text style={styles.agendaCount}>{jobs.length} totales</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#F5C518" size="large" style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            renderItem={renderJobCard}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tienes misiones asignadas hoy.</Text>
                <Text style={styles.emptySubText}>Asegúrate de estar en turno activo.</Text>
              </View>
            }
          />
        )}
      </ScrollView>

      {/* MISSION DETAILS MODAL */}
      {selectedJob && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedJob}
          onRequestClose={() => setSelectedJob(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              {/* Top accent bar */}
              <View style={styles.modalAccentBar} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalClientName}>{selectedJob.client_name}</Text>
                  <Text style={styles.modalServiceType}>{selectedJob.service_type}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedJob(null)} style={styles.closeModalBtn}>
                  <Text style={styles.closeModalBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalInfoCard}>
                  <Text style={styles.modalLabel}>DIRECCIÓN</Text>
                  <Text style={styles.modalValue}>{selectedJob.address}</Text>
                  <TouchableOpacity 
                    style={styles.mapBtn}
                    onPress={() => handleOpenMap(selectedJob.address)}
                  >
                    <Text style={styles.mapBtnText}>📍 ABRIR EN MAPAS NATIVOS</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInfoCard}>
                  <Text style={styles.modalLabel}>PRECIO TOTAL</Text>
                  <Text style={styles.modalValue}>${selectedJob.total_price || 0} USD</Text>
                </View>

                {selectedJob.status === 'in_progress' ? (
                  <View style={styles.checklistSection}>
                    <Text style={styles.modalLabel}>CHECKLIST DE OPERACIONES</Text>
                    {Object.keys(checklist).map((task) => (
                      <TouchableOpacity 
                        key={task} 
                        style={styles.checkRow}
                        onPress={() => toggleChecklistItem(task)}
                      >
                        <View style={[styles.checkbox, checklist[task] && styles.checkboxChecked]}>
                          {checklist[task] && <Text style={styles.checkboxTick}>✓</Text>}
                        </View>
                        <Text style={[styles.checkText, checklist[task] && styles.checkTextChecked]}>
                          {task}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity 
                      style={styles.completeBtn}
                      onPress={() => completeMission(selectedJob)}
                    >
                      <Text style={styles.completeBtnText}>✅ COMPLETAR MISIÓN</Text>
                    </TouchableOpacity>
                  </View>
                ) : selectedJob.status === 'scheduled' ? (
                  <View style={styles.actionSection}>
                    <Text style={styles.pendingNoticeText}>Misión Programada para hoy</Text>
                    <TouchableOpacity 
                      style={styles.startBtn}
                      onPress={() => startMission(selectedJob)}
                    >
                      <Text style={styles.startBtnText}>🚀 INICIAR TRABAJO AHORA</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.completedNotice}>
                    <Text style={styles.completedNoticeText}>✓ Misión Completada con Éxito</Text>
                    <Text style={styles.completedNoticeSub}>Esta misión ya fue finalizada y reportada a control.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
    paddingTop: 60,
  },
  headerHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 197, 24, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#F5C518',
    fontWeight: '900',
    fontSize: 16,
  },
  hudTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hudSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  goldText: {
    color: '#F5C518',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 8,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  shiftCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftTitle: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  shiftStatusText: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  greenText: {
    color: '#10b981',
  },
  redText: {
    color: '#ef4444',
  },
  walletCard: {
    backgroundColor: 'rgba(10, 21, 16, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.1)',
    paddingBottom: 10,
    marginBottom: 15,
  },
  walletTitle: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  walletSystemStatus: {
    color: 'rgba(16, 185, 129, 0.5)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: '#white',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  totalEarnedText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
  },
  cashoutBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashoutBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.4,
  },
  cashoutBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  agendaTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  agendaCount: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  jobCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  jobCardActive: {
    borderColor: 'rgba(245, 197, 24, 0.3)',
    backgroundColor: 'rgba(245, 197, 24, 0.02)',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  clientName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  serviceType: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 197, 24, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  statusText: {
    color: '#F5C518',
    fontSize: 8,
    fontWeight: '900',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextCompleted: {
    color: '#a855f7',
  },
  jobFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoEmoji: {
    fontSize: 12,
    marginRight: 6,
  },
  infoText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  actionPromptRow: {
    marginTop: 15,
    alignItems: 'flex-end',
  },
  actionPromptText: {
    color: '#F5C518',
    fontSize: 10,
    fontWeight: '900',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c0f17',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  modalAccentBar: {
    width: 60,
    height: 4,
    backgroundColor: '#F5C518',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalClientName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  modalServiceType: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '800',
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
  },
  modalLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  mapBtn: {
    backgroundColor: 'rgba(245, 197, 24, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.3)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  mapBtnText: {
    color: '#F5C518',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  checklistSection: {
    marginTop: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  checkboxTick: {
    color: 'black',
    fontWeight: '900',
    fontSize: 12,
  },
  checkText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  checkTextChecked: {
    color: '#475569',
    textDecorationLine: 'line-through',
  },
  completeBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 15,
  },
  completeBtnText: {
    color: 'black',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  actionSection: {
    padding: 20,
    alignItems: 'center',
  },
  pendingNoticeText: {
    color: '#F5C518',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 15,
  },
  startBtn: {
    backgroundColor: '#F5C518',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  startBtnText: {
    color: 'black',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  completedNotice: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  completedNoticeText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  completedNoticeSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

