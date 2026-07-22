import { Redirect } from 'expo-router';

export default function Index() {
  // The root layout handles redirect logic; this just renders a null route.
  return <Redirect href="/(tabs)" />;
}
