import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface SavedEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

const ADDRESS_KEY = '@account_address';
const EMERGENCY_CONTACT_KEY = '@account_emergency_contact';

const EMPTY_ADDRESS: SavedAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pinCode: '',
  country: '',
};

const EMPTY_EMERGENCY_CONTACT: SavedEmergencyContact = {
  name: '',
  relationship: '',
  phone: '',
};

export async function getSavedAddress(): Promise<SavedAddress> {
  try {
    const raw = await AsyncStorage.getItem(ADDRESS_KEY);
    if (!raw) return EMPTY_ADDRESS;
    const parsed = JSON.parse(raw) as Partial<SavedAddress>;
    return {
      line1: parsed.line1 ?? '',
      line2: parsed.line2 ?? '',
      city: parsed.city ?? '',
      state: parsed.state ?? '',
      pinCode: parsed.pinCode ?? '',
      country: parsed.country ?? '',
    };
  } catch {
    return EMPTY_ADDRESS;
  }
}

export async function setSavedAddress(address: SavedAddress): Promise<void> {
  try {
    await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  } catch {
    // ignore storage write failures
  }
}

export async function getSavedEmergencyContact(): Promise<SavedEmergencyContact> {
  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_CONTACT_KEY);
    if (!raw) return EMPTY_EMERGENCY_CONTACT;
    const parsed = JSON.parse(raw) as Partial<SavedEmergencyContact>;
    return {
      name: parsed.name ?? '',
      relationship: parsed.relationship ?? '',
      phone: parsed.phone ?? '',
    };
  } catch {
    return EMPTY_EMERGENCY_CONTACT;
  }
}

export async function setSavedEmergencyContact(contact: SavedEmergencyContact): Promise<void> {
  try {
    await AsyncStorage.setItem(EMERGENCY_CONTACT_KEY, JSON.stringify(contact));
  } catch {
    // ignore storage write failures
  }
}
