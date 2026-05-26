import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchJobs(session.user.user_metadata.name);
    });
  }, []);

  const fetchJobs = async (workerName) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .ilike('team_assigned', `%${workerName}%`)
      .order('scheduled_date', { ascending: true });

    if (error) {
      // Fallback in case table is elevore_missions
      const { data: mData, error: mError } = await supabase
        .from('elevore_missions')
        .select('*')
        .ilike('team_assigned', `%${workerName}%`)
        .order('scheduled_date', { ascending: true });
        
      if (mData) setJobs(mData);
    } else {
      setJobs(data);
    }
    setLoading(false);
  };

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) router.replace('/');
  }

  const markCompleted = async (job) => {
    Alert.alert(
      "Confirm completion",
      `Mark ${job.client_name}'s cleaning as completed?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Completed", 
          onPress: async () => {
            const table = job.service_type ? 'jobs' : 'elevore_missions';
            const { error } = await supabase.from(table).update({ status: 'completed' }).eq('id', job.id);
            if (!error) fetchJobs(session?.user?.user_metadata?.name);
          }
        }
      ]
    );
  };

  const renderJob = ({ item }) => (
    <View style={{ backgroundColor: '#0f172a', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>{item.client_name}</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>{item.address}</Text>
        </View>
        <View style={{ backgroundColor: item.status === 'completed' ? '#059669' : '#F59E0B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 }}>
          <Text style={{ color: item.status === 'completed' ? 'white' : 'black', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>
            {item.status}
          </Text>
        </View>
      </View>
      
      {item.status !== 'completed' && item.status !== 'paid' && (
        <TouchableOpacity 
          style={{ backgroundColor: '#F59E0B', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
          onPress={() => markCompleted(item)}
        >
          <Text style={{ color: 'black', fontWeight: '900', textTransform: 'uppercase', fontSize: 12 }}>Mark as Completed</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#020617', padding: 24, paddingTop: 60 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <View>
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Welcome back,</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: 'white' }}>{session?.user?.user_metadata?.name || 'Staff'}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={{ backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 }}>Your Missions</Text>

      {loading ? (
        <ActivityIndicator color="#F59E0B" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          ListEmptyComponent={
            <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 40, fontWeight: '600' }}>No missions assigned to you yet.</Text>
          }
        />
      )}
    </View>
  );
}
