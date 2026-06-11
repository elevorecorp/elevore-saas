import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [tab, setTab] = useState<'ceo' | 'staff'>('staff'); // Default to staff
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if session or profile already exists
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
        return;
      }

      const storedProfile = await AsyncStorage.getItem('elevore_staff_profile');
      if (storedProfile) {
        router.replace('/dashboard');
      }
    }
    checkExistingSession();
  }, []);

  async function handleCeoLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Error de Inicio de Sesión', 'Credenciales inválidas. Intenta de nuevo.');
    } else {
      router.replace('/dashboard');
    }
    setLoading(false);
  }

  async function handleStaffLogin() {
    if (!email || !pin) {
      Alert.alert('Error', 'Por favor ingresa tu correo de staff y PIN.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPin = pin.trim();

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://elevore-saas.vercel.app';
      const response = await fetch(`${apiUrl}/api/login-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, passcode: cleanPin }),
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.profile) {
        // Save profile and tenant details in AsyncStorage
        await AsyncStorage.setItem('elevore_staff_profile', JSON.stringify(resData.profile));
        await AsyncStorage.setItem('elevore_tenant_name', resData.tenantName || 'ELEVORE EMPIRE');
        
        router.replace('/dashboard');
      } else {
        Alert.alert('Acceso Denegado', resData.error || 'PIN o Correo incorrectos. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error during staff login:', err);
      Alert.alert('Error de Conexión', 'No se pudo conectar al servidor. Revisa tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Glow ambient effects */}
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            ELEVORE <Text style={styles.logoItalic}>EMPIRE</Text>
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>STAFF OPERATIONS PORTAL</Text>
          </View>
        </View>

        <View style={styles.card}>
          {/* Subtle top indicator bar */}
          <View style={styles.cardIndicator} />

          {/* Custom Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'staff' && styles.tabActive]}
              onPress={() => setTab('staff')}
            >
              <Text style={[styles.tabButtonText, tab === 'staff' && styles.tabActiveText]}>
                👷 STAFF / PIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, tab === 'ceo' && styles.tabActive]}
              onPress={() => setTab('ceo')}
            >
              <Text style={[styles.tabButtonText, tab === 'ceo' && styles.tabActiveText]}>
                👑 CEO / ADMIN
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'staff' ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>CORREO DE STAFF</Text>
              <TextInput
                style={styles.input}
                onChangeText={setEmail}
                value={email}
                placeholder="ej: isaac@empresa.com"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                keyboardType="email-address"
                disabled={loading}
              />

              <Text style={styles.label}>CÓDIGO PIN</Text>
              <TextInput
                style={styles.input}
                onChangeText={setPin}
                value={pin}
                secureTextEntry={true}
                placeholder="••••"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                keyboardType="numeric"
                disabled={loading}
              />

              <TouchableOpacity
                style={styles.submitButton}
                disabled={loading}
                onPress={handleStaffLogin}
              >
                {loading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text style={styles.submitButtonText}>INGRESAR AL PANEL</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
              <TextInput
                style={styles.input}
                onChangeText={setEmail}
                value={email}
                placeholder="ceo@empresa.com"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                keyboardType="email-address"
                disabled={loading}
              />

              <Text style={styles.label}>CONTRASEÑA</Text>
              <TextInput
                style={styles.input}
                onChangeText={setPassword}
                value={password}
                secureTextEntry={true}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                disabled={loading}
              />

              <TouchableOpacity
                style={styles.submitButton}
                disabled={loading}
                onPress={handleCeoLogin}
              >
                {loading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text style={styles.submitButtonText}>ACCESO ADMINISTRADOR</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footerText}>ELEVORE OPERATIONS OS v97.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#030303',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
    opacity: 0.7,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    opacity: 0.6,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#white',
    letterSpacing: -1,
  },
  logoItalic: {
    color: '#F5C518',
    fontStyle: 'italic',
  },
  badge: {
    marginTop: 8,
    backgroundColor: 'rgba(245, 197, 24, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    color: '#F5C518',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 35,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cardIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#F5C518',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#F5C518',
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  tabActiveText: {
    color: '#000000',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: '#020204',
    color: 'white',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#F5C518',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    marginTop: 10,
  },
  submitButtonText: {
    color: 'black',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  footerText: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 30,
    letterSpacing: 2,
  },
});

