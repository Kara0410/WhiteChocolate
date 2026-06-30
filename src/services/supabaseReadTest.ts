import { supabase } from '@/lib/supabase';

export async function readParkingTest() {
  const { data, error } = await supabase.from('parking_test').select('*').limit(1);

  if (error) {
    throw new Error(`Supabase parking_test read failed: ${error.message}`);
  }

  return data;
}
