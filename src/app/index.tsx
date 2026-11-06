import { Redirect } from 'expo-router';

import { useStore } from '@/lib/store';

export default function Index() {
  const { p } = useStore();
  return <Redirect href={p.onboarded ? '/(tabs)' : '/onboarding'} />;
}
