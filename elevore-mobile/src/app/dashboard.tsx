import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Linking, Switch, Platform } from 'react-native';
import { supabase } from '../supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

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

  // Payout history state
  const [payouts, setPayouts] = useState<any[]>([]);
  
  // Modal detail state
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [checklist, setChecklist] = useState<{[key: string]: boolean}>({
    'Cocina e Insumos': false,
    'Baños y Espejos': false,
    'Habitaciones y Tendidos': false,
    'Pisos y Aspirado': false,
    'Inspección Final de Calidad': false,
  });

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
          await refreshStaffBalance(staffProfile.id, staffProfile.passcode);
          await fetchStaffPayouts(staffProfile.id, staffProfile.passcode);
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

  // Real GPS Broadcaster when onDuty is active using expo-location
  useEffect(() => {
    if (!onDuty || !profile?.id || !profile?.tenant_id) return;

    let timer: NodeJS.Timeout;
    let permissionGranted = false;

    async function setupLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[GPS Broadcaster]: Location permission denied.');
          Alert.alert(
            'Permiso de Ubicación Requerido',
            'Para transmitir tu posición a los clientes durante el turno, por favor habilita el permiso de ubicación.'
          );
          return;
        }
        permissionGranted = true;
        // Broadcast immediately upon permission grant
        await broadcastLocation();
      } catch (e) {
        console.warn('[GPS Broadcaster]: Permission error:', e);
      }
    }

    async function broadcastLocation() {
      try {
        let lat = 0;
        let lng = 0;

        if (permissionGranted) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        } else {
          // Fallback to Orlando simulated coordinates if permission is denied or loading
          lat = 28.5383 + (Math.random() - 0.5) * 0.01;
          lng = -81.3792 + (Math.random() - 0.5) * 0.01;
        }

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
          console.log('[GPS Broadcaster]: Broadcasted real-time coordinates:', lat, lng);
        }
      } catch (err) {
        console.warn('[GPS Broadcaster]: Error broadcasting:', err);
      }
    }

    setupLocation();

    // Loop every 15 seconds
    timer = setInterval(broadcastLocation, 15000);

    return () => {
      clearInterval(timer);
    };
  }, [onDuty, profile?.id, profile?.tenant_id]);

  // Real-time listener for missions & in-app push notifications
  useEffect(() => {
    if (!profile?.name || !profile?.tenant_id) return;

    // Helper utility to calculate day difference (dAgo)
    const getDaysAgo = (dateStr: string) => {
      if (!dateStr) return 999;
      const tDate = new Date(dateStr);
      const diff = new Date().getTime() - tDate.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const channel = supabase
      .channel(`staff_missions_realtime:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'elevore_missions',
          filter: `tenant_id=eq.${profile.tenant_id}`
        },
        async (payload: any) => {
          const team = payload.new?.team_assigned || payload.old?.team_assigned || '';
          const isAssigned = team.toLowerCase().includes(profile.name.toLowerCase());

          if (!isAssigned) return;

          console.log('[Real-time Staff Mission Event]:', payload.eventType, payload.new);

          // Re-fetch missions to keep state in sync
          await fetchMissions(profile.name, profile.tenant_id);

          // Generate notification details
          let title = '';
          let body = '';
          const now = new Date().toISOString();

          if (payload.eventType === 'INSERT') {
            title = '🆕 Nueva Misión Asignada';
            body = `Se te ha asignado una nueva misión: ${payload.new.service_type || 'Servicio'} para ${payload.new.client_name || 'Cliente'} en ${payload.new.address || 'TBD'}.`;
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old?.status || '';
            const newStatus = payload.new?.status || '';
            const clientName = payload.new?.client_name || 'Cliente';
            const serviceType = payload.new?.service_type || 'Servicio';

            if (oldStatus !== newStatus && newStatus) {
              title = '🔄 Estado de Misión Actualizado';
              body = `La misión "${serviceType}" de ${clientName} cambió su estado a: ${newStatus.toUpperCase()}.`;
            } else {
              const oldMsgs = payload.old?.specs?.chat_messages || [];
              const newMsgs = payload.new?.specs?.chat_messages || [];
              if (newMsgs.length > oldMsgs.length) {
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.sender === 'admin') {
                  title = '💬 Mensaje del CEO (Soporte)';
                  body = `El CEO te envió un mensaje: "${lastMsg.text}"`;
                }
              }
            }
          }

          if (title && body) {
            const newNotification = {
              id: Math.random().toString(36).substring(2, 9),
              title,
              body,
              time: now,
              read: false
            };

            setNotifications(prev => {
              const updated = [newNotification, ...prev];
              AsyncStorage.setItem(`elevore_notifications_${profile.id}`, JSON.stringify(updated));
              return updated;
            });
            setUnreadCount(prev => prev + 1);

            // Display standard alert
            Alert.alert(title, body);
          }
        }
      )
      .subscribe();

    // Load initial notifications from AsyncStorage
    async function loadNotifications() {
      try {
        const stored = await AsyncStorage.getItem(`elevore_notifications_${profile.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n: any) => !n.read).length);
        }
      } catch (err) {
        console.warn('Failed to load local notifications:', err);
      }
    }
    loadNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.name, profile?.tenant_id, profile?.id]);

  const openNotificationsModal = async () => {
    setShowNotifications(true);
    if (profile?.id) {
      const readNotifications = notifications.map(n => ({ ...n, read: true }));
      setNotifications(readNotifications);
      setUnreadCount(0);
      await AsyncStorage.setItem(`elevore_notifications_${profile.id}`, JSON.stringify(readNotifications));
    }
  };

  const clearNotifications = async () => {
    if (profile?.id) {
      setNotifications([]);
      setUnreadCount(0);
      await AsyncStorage.removeItem(`elevore_notifications_${profile.id}`);
    }
  };

  const refreshStaffBalance = async (staffId: string, passcode: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_staff_profile_secure', {
          p_staff_id: staffId,
          p_passcode: passcode
        });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setWalletBalance(Number(data[0].wallet_balance) || 0);
        setTotalEarned(Number(data[0].total_earned) || 0);
      }
    } catch (err) {
      console.warn('Could not refresh staff balance:', err);
    }
  };

  const fetchStaffPayouts = async (staffId: string, passcode: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_staff_payouts_secure', {
          p_staff_id: staffId,
          p_passcode: passcode
        });
      if (error) throw error;
      if (data) setPayouts(data);
    } catch (err) {
      console.warn('Could not fetch staff payouts:', err);
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
                const { error: rpcErr } = await supabase
                  .rpc('request_cashout_secure', {
                    p_staff_id: profile.id,
                    p_passcode: profile.passcode
                  });
                
                if (rpcErr) throw rpcErr;
                
                await refreshStaffBalance(profile.id, profile.passcode);
                await fetchStaffPayouts(profile.id, profile.passcode);
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

  const handleWhatsAppRouteAlert = async (job: any) => {
    const phone = (job.client_phone || '').replace(/\D/g, '');
    if (!phone) {
      Alert.alert('Error', 'El cliente no tiene un número de teléfono registrado.');
      return;
    }

    try {
      setLoading(true);
      // 1. Fetch tenant_settings for the custom route template
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('wa_template_route')
        .eq('tenant_id', job.tenant_id)
        .maybeSingle();

      const baseTemplate = settings?.wa_template_route || 
        'Hola {CLIENT_NAME}! ✨ El equipo de ELEVORE va en camino a tu ubicación. Sigue nuestra ruta en tiempo real aquí: {PORTAL_URL}';

      // 2. Populate template fields
      const portalUrl = `https://elevore-saas.vercel.app/?jid=${job.id}`;
      const populatedText = baseTemplate
        .replace(/{CLIENT_NAME}/g, job.client_name || 'Cliente')
        .replace(/{SERVICE_TYPE}/g, job.service_type || 'Limpieza')
        .replace(/{DATE}/g, job.scheduled_date || 'Hoy')
        .replace(/{TEAM}/g, job.team_assigned || 'Cuadrilla')
        .replace(/{ADDRESS}/g, job.address || 'Ubicación')
        .replace(/{PORTAL_URL}/g, portalUrl)
        .replace(/{JOB_ID}/g, job.id || '');

      // 3. Trigger en_route status change in database
      await supabase
        .from('elevore_missions')
        .update({ 
          specs: { 
            ...(job.specs || {}), 
            en_route: true, 
            en_route_at: new Date().toISOString() 
          } 
        })
        .eq('id', job.id);

      // Update local state if this is the active modal job
      if (selectedJob && selectedJob.id === job.id) {
        setSelectedJob((prev: any) => ({
          ...prev,
          specs: {
            ...(prev?.specs || {}),
            en_route: true,
            en_route_at: new Date().toISOString()
          }
        }));
      }
      setJobs(prev => prev.map(j => j.id === job.id ? {
        ...j,
        specs: {
          ...(j.specs || {}),
          en_route: true,
          en_route_at: new Date().toISOString()
        }
      } : j));

      // 4. Launch native WhatsApp URL or wa.me fallback
      const cleanPhone = phone.length === 10 ? '1' + phone : phone;
      const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(populatedText)}`;
      const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(populatedText)}`;
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(fallbackUrl);
        }
      });
    } catch (err) {
      console.error('Error sending WhatsApp route alert:', err);
      Alert.alert('Error', 'No se pudo generar la alerta de WhatsApp.');
    } finally {
      setLoading(false);
    }
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
              const { data, error: rpcErr } = await supabase
                .rpc('complete_mission_secure', {
                  p_mission_id: job.id,
                  p_staff_id: profile.id,
                  p_passcode: profile.passcode
                });

              if (rpcErr) throw rpcErr;
              
              if (data && data.length > 0) {
                setWalletBalance(Number(data[0].wallet_balance) || 0);
                setTotalEarned(Number(data[0].total_earned) || 0);
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

  const gamificationStats = React.useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'paid');
    const completedCount = completedJobs.length;
    
    // Calculate Average Rating
    const ratedJobs = completedJobs.filter(j => typeof j.client_rating === 'number' && j.client_rating > 0);
    const avgRating = ratedJobs.length > 0 
      ? Number((ratedJobs.reduce((sum, j) => sum + j.client_rating, 0) / ratedJobs.length).toFixed(1))
      : 5.0;

    // Calculate Active Streak (consecutive completed missions with no incident note)
    const sortedCompleted = [...completedJobs].sort((a, b) => new Date(b.scheduled_date || b.created_at).getTime() - new Date(a.scheduled_date || a.created_at).getTime());
    let activeStreak = 0;
    for (const job of sortedCompleted) {
      if (!job.incident_note) {
        activeStreak++;
      } else {
        break;
      }
    }

    // Calculate XP
    const xp = (completedCount * 150) + Math.round(avgRating * 100);

    // Determine Rank details
    let rank = 'Bronce';
    let color = '#cd7f32';
    let bonusPct = 0;
    let nextRank = 'Plata';
    let nextRankXp = 600;
    let progress = xp / 600;

    if (xp >= 4500) {
      rank = 'Platino';
      color = '#38bdf8';
      bonusPct = 8;
      nextRank = 'Nivel Máximo 🚀';
      nextRankXp = 4500;
      progress = 1.0;
    } else if (xp >= 2000) {
      rank = 'Oro';
      color = '#F5C518';
      bonusPct = 5;
      nextRank = 'Platino';
      nextRankXp = 4500;
      progress = (xp - 2000) / 2500;
    } else if (xp >= 600) {
      rank = 'Plata';
      color = '#e2e8f0';
      bonusPct = 2;
      nextRank = 'Oro';
      nextRankXp = 2000;
      progress = (xp - 600) / 1400;
    }

    progress = Math.min(1.0, Math.max(0.0, progress));

    return {
      completedCount,
      avgRating,
      activeStreak,
      xp,
      rank,
      color,
      bonusPct,
      nextRank,
      nextRankXp,
      progress
    };
  }, [jobs]);

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
        
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={openNotificationsModal} style={styles.notificationBellBtn}>
            <Text style={styles.bellEmoji}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>SALIR</Text>
          </TouchableOpacity>
        </View>
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

        {/* Gamification HUD Card */}
        {profile?.role === 'staff' && (
          <View style={[styles.gamifyCard, { borderColor: gamificationStats.color + '33' }]}>
            <View style={styles.gamifyHeader}>
              <View>
                <Text style={styles.gamifyTitle}>RANGO OPERATIVO</Text>
                <Text style={[styles.gamifyRankText, { color: gamificationStats.color }]}>
                  ✨ {gamificationStats.rank.toUpperCase()}
                </Text>
              </View>
              <View style={styles.streakContainer}>
                <Text style={styles.streakFlame}>🔥</Text>
                <View>
                  <Text style={styles.streakCount}>{gamificationStats.activeStreak}</Text>
                  <Text style={styles.streakLabel}>RACHA PERFECTA</Text>
                </View>
              </View>
            </View>

            {/* XP progress bar */}
            <View style={styles.xpProgressWrapper}>
              <View style={styles.xpRow}>
                <Text style={styles.xpText}>{gamificationStats.xp} XP acumulados</Text>
                <Text style={styles.xpNextText}>
                  {gamificationStats.xp >= 4500 ? 'Rango Máximo' : `Siguiente Rango: ${gamificationStats.nextRankXp} XP`}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${Math.round(gamificationStats.progress * 100)}%`,
                      backgroundColor: gamificationStats.color
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Quality stats row */}
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{gamificationStats.completedCount}</Text>
                <Text style={styles.miniStatLabel}>MISIONES</Text>
              </View>
              <View style={styles.miniStatSeparator} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>⭐ {gamificationStats.avgRating}</Text>
                <Text style={styles.miniStatLabel}>RATING PROMEDIO</Text>
              </View>
              <View style={styles.miniStatSeparator} />
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: '#10b981' }]}>+{gamificationStats.bonusPct}%</Text>
                <Text style={styles.miniStatLabel}>BONO COMISIÓN</Text>
              </View>
            </View>
          </View>
        )}

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

            {/* Recent Payouts Ledger list */}
            {payouts.length > 0 && (
              <View style={styles.payoutsLedger}>
                <Text style={styles.ledgerHeader}>HISTORIAL DE RETIROS (ÚLTIMOS 5)</Text>
                {payouts.map((item) => (
                  <View key={item.id} style={styles.ledgerRow}>
                    <View>
                      <Text style={styles.ledgerDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.ledgerRef} numberOfLines={1}>
                        {item.reference_note || 'Retiro Zelle'}
                      </Text>
                    </View>
                    <Text style={styles.ledgerAmount}>-${Number(item.amount).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
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
                  <Text style={styles.modalLabel}>NOTIFICACIÓN AL CLIENTE</Text>
                  <TouchableOpacity 
                    style={styles.waAlertBtn}
                    onPress={() => handleWhatsAppRouteAlert(selectedJob)}
                  >
                    <Text style={styles.waAlertBtnText}>📲 AVISAR "EN CAMINO" POR WHATSAPP</Text>
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

      {/* NOTIFICATIONS CENTER MODAL */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalAccentBar} />
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalClientName}>CENTRO DE ALERTAS</Text>
                <Text style={styles.modalServiceType}>Notificaciones y Turnos en Vivo</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearNotifications} style={styles.clearAllBtn}>
                <Text style={styles.clearAllText}>✕ LIMPIAR HISTORIAL</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { borderWidth: 0, marginTop: 40 }]}>
                  <Text style={styles.emptyText}>🔔 SIN ALERTAS NUEVAS</Text>
                  <Text style={styles.emptySubText}>Cualquier cambio de misiones se notificará aquí en vivo.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.notificationItem, !item.read && styles.notificationItemUnread]}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(item.time).toLocaleDateString([], { day: 'numeric', month: 'short' })} • {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
  payoutsLedger: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.1)',
    paddingTop: 15,
  },
  ledgerHeader: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ledgerDate: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
  },
  ledgerRef: {
    color: '#64748B',
    fontSize: 7,
    fontWeight: '600',
    marginTop: 1,
    maxWidth: 180,
  },
  ledgerAmount: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '900',
  },
  waAlertBtn: {
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  waAlertBtnText: {
    color: '#25D366',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gamifyCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  gamifyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gamifyTitle: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  gamifyRankText: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakFlame: {
    fontSize: 18,
    marginRight: 6,
  },
  streakCount: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 12,
  },
  streakLabel: {
    color: '#ef4444',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  xpProgressWrapper: {
    marginBottom: 16,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  xpText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '800',
  },
  xpNextText: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatVal: {
    color: 'white',
    fontSize: 13,
    fontWeight: '950',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  },
  miniStatLabel: {
    color: '#64748B',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  miniStatSeparator: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBellBtn: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bellEmoji: {
    fontSize: 16,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(245, 197, 24, 0.04)',
    borderLeftWidth: 3,
    borderLeftColor: '#F5C518',
  },
  notificationTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  notificationBody: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  notificationTime: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
  },
  clearAllBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  clearAllText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
});
