import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type PropsWithChildren,
} from 'react';

import type {
  Vehicle,
  VehicleFieldErrors,
  VehicleInput,
} from '@/types/vehicle';
import {
  clearStoredVehicles,
  loadStoredVehicleState,
  saveVehicleState,
  type StoredVehicleState,
} from '@/utils/vehicle-storage';
import {
  addVehicleToState,
  removeVehicleFromState,
  setActiveVehicleInState,
  validateVehicleInput,
} from '@/utils/vehicles';

type VehicleState = StoredVehicleState;

type VehicleAction =
  | { type: 'add'; vehicle: Vehicle }
  | { type: 'clear' }
  | { type: 'hydrate'; state: VehicleState }
  | { type: 'remove'; vehicleId: string }
  | { type: 'set-active'; vehicleId: string };

type AddVehicleResult =
  | { ok: true; vehicle: Vehicle }
  | { ok: false; errors: VehicleFieldErrors };

type VehicleContextValue = VehicleState & {
  addVehicle: (input: VehicleInput) => AddVehicleResult;
  clearVehicles: () => void;
  isActiveVehicle: (vehicleId: string) => boolean;
  removeVehicle: (vehicleId: string) => void;
  setActiveVehicle: (vehicleId: string) => void;
};

const initialState: VehicleState = {
  activeVehicleId: null,
  vehicles: [],
};

function vehicleReducer(
  state: VehicleState,
  action: VehicleAction,
): VehicleState {
  switch (action.type) {
    case 'add':
      return addVehicleToState(
        state.vehicles,
        state.activeVehicleId,
        action.vehicle,
      );
    case 'clear':
      if (state.vehicles.length === 0 && state.activeVehicleId === null) {
        return state;
      }

      return initialState;
    case 'hydrate':
      return action.state;
    case 'remove':
      if (!state.vehicles.some((vehicle) => vehicle.id === action.vehicleId)) {
        return state;
      }

      return removeVehicleFromState(
        state.vehicles,
        state.activeVehicleId,
        action.vehicleId,
      );
    case 'set-active': {
      const activeVehicleId = setActiveVehicleInState(
        state.vehicles,
        state.activeVehicleId,
        action.vehicleId,
      );

      if (activeVehicleId === state.activeVehicleId) {
        return state;
      }

      return {
        ...state,
        activeVehicleId,
      };
    }
  }
}

const VehicleContext = createContext<VehicleContextValue | null>(null);

export function VehicleProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(vehicleReducer, initialState);
  const idSequenceRef = useRef(0);
  const hydratedRef = useRef(false);
  const interactedRef = useRef(false);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    loadStoredVehicleState()
      .then((storedState) => {
        // A user mutation that lands before hydration wins over stored data.
        hydratedRef.current = true;
        if (
          !cancelled &&
          !interactedRef.current &&
          storedState.vehicles.length > 0
        ) {
          dispatch({ type: 'hydrate', state: storedState });
        }
      })
      .catch((error: unknown) => {
        hydratedRef.current = true;
        if (__DEV__) {
          console.warn(
            '[VehicleProvider] failed to load stored vehicles',
            error,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    writeQueueRef.current = writeQueueRef.current
      .then(() => saveVehicleState(state))
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('[VehicleProvider] failed to save vehicles', error);
        }
      });
  }, [state]);

  const addVehicle = useCallback(
    (input: VehicleInput): AddVehicleResult => {
      const { errors, value } = validateVehicleInput(input, state.vehicles);

      if (Object.keys(errors).length > 0) {
        return { ok: false, errors };
      }

      idSequenceRef.current += 1;
      const vehicle: Vehicle = {
        ...value,
        id: `vehicle-${Date.now()}-${idSequenceRef.current}`,
        createdAt: new Date().toISOString(),
      };

      interactedRef.current = true;
      dispatch({ type: 'add', vehicle });
      return { ok: true, vehicle };
    },
    [state.vehicles],
  );

  const removeVehicle = useCallback((vehicleId: string) => {
    interactedRef.current = true;
    dispatch({ type: 'remove', vehicleId });
  }, []);

  const setActiveVehicle = useCallback((vehicleId: string) => {
    interactedRef.current = true;
    dispatch({ type: 'set-active', vehicleId });
  }, []);

  const clearVehicles = useCallback(() => {
    interactedRef.current = true;
    dispatch({ type: 'clear' });

    // Clear the stored key directly as well, so the data is removed even
    // if clearing happens before hydration enables the autosave effect.
    writeQueueRef.current = writeQueueRef.current
      .then(() => clearStoredVehicles())
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn(
            '[VehicleProvider] failed to clear stored vehicles',
            error,
          );
        }
      });
  }, []);

  const isActiveVehicle = useCallback(
    (vehicleId: string) => state.activeVehicleId === vehicleId,
    [state.activeVehicleId],
  );

  const value = useMemo(
    () => ({
      activeVehicleId: state.activeVehicleId,
      vehicles: state.vehicles,
      addVehicle,
      clearVehicles,
      isActiveVehicle,
      removeVehicle,
      setActiveVehicle,
    }),
    [
      addVehicle,
      clearVehicles,
      isActiveVehicle,
      removeVehicle,
      setActiveVehicle,
      state.activeVehicleId,
      state.vehicles,
    ],
  );

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicles() {
  const value = useContext(VehicleContext);

  if (!value) {
    throw new Error('useVehicles must be used within VehicleProvider');
  }

  return value;
}
