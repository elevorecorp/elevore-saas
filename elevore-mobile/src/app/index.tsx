import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard');
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', padding: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#F59E0B', textTransform: 'uppercase' }}>Elevore</Text>
        <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '800', letterSpacing: 2 }}>STAFF PORTAL</Text>
      </View>

      <View style={{ backgroundColor: '#0f172a', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 }}>Email</Text>
        <TextInput
          style={{ backgroundColor: '#020617', color: 'white', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@elevore.com"
          placeholderTextColor="#475569"
          autoCapitalize={'none'}
        />

        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 }}>Password</Text>
        <TextInput
          style={{ backgroundColor: '#020617', color: 'white', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="********"
          placeholderTextColor="#475569"
          autoCapitalize={'none'}
        />

        <TouchableOpacity 
          style={{ backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center' }} 
          disabled={loading} 
          onPress={signInWithEmail}
        >
          {loading ? <ActivityIndicator color="black" /> : <Text style={{ color: 'black', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' }}>Login</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
