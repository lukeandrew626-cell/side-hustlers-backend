const VPIC_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

type VpicMakeItem = {
  MakeId?: number;
  MakeName?: string;
};

type VpicModelItem = {
  Model_ID?: number;
  Model_Name?: string;
};

type VpicResponse<T> = {
  Count: number;
  Message: string;
  SearchCriteria?: string;
  Results: T[];
};

function cleanList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export async function fetchMakesForPassengerVehicles(): Promise<string[]> {
  const response = await fetch(
    `${VPIC_BASE_URL}/GetMakesForVehicleType/car?format=json`
  );

  if (!response.ok) {
    throw new Error('Failed to load vehicle makes.');
  }

  const data: VpicResponse<VpicMakeItem> = await response.json();

  return cleanList(
    (data.Results || [])
      .map((item) => item.MakeName || '')
  );
}

export async function fetchModelsForMakeYear(
  make: string,
  year: string
): Promise<string[]> {
  const safeMake = encodeURIComponent(make.trim());
  const safeYear = encodeURIComponent(year.trim());

  const response = await fetch(
    `${VPIC_BASE_URL}/GetModelsForMakeYear/make/${safeMake}/modelyear/${safeYear}?format=json`
  );

  if (!response.ok) {
    throw new Error('Failed to load vehicle models.');
  }

  const data: VpicResponse<VpicModelItem> = await response.json();

  return cleanList(
    (data.Results || [])
      .map((item) => item.Model_Name || '')
  );
}