import {
  createContext,
  useCallback,
  useContext,
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
  addVehicleToState,
  removeVehicleFromState,
  setActiveVehicleInState,
  validateVehicleInput,
} from '@/utils/vehicles';

type VehicleState = {
  activeVehicleId: string | null;
  vehicles: Vehicle[];
};

type VehicleAction =
  | { type: 'add'; vehicle: Vehicle }
  | { type: 'remove'; vehicleId: string }
  | { type: 'set-active'; vehicleId: string };

type AddVehicleResult =
  | { ok: true; vehicle: Vehicle }
  | { ok: false; errors: VehicleFieldErrors };

type VehicleContextValue = VehicleState & {
  addVehicle: (input: VehicleInput) => AddVehicleResult;
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

      dispatch({ type: 'add', vehicle });
      return { ok: true, vehicle };
    },
    [state.vehicles],
  );

  const removeVehicle = useCallback((vehicleId: string) => {
    dispatch({ type: 'remove', vehicleId });
  }, []);

  const setActiveVehicle = useCallback((vehicleId: string) => {
    dispatch({ type: 'set-active', vehicleId });
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
      isActiveVehicle,
      removeVehicle,
      setActiveVehicle,
    }),
    [
      addVehicle,
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
