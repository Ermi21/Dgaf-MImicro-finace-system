import type { City, Job, Subcity, Woreda } from "../types";

export const DEFAULT_CITIES: City[] = [
  { id: "627a11d6-d653-4eb0-b6b3-ba784b8afbd7", name: "Addis Ababa", is_active: true },
  { id: "eb45a25d-a349-4eee-b566-65da3e3d3bf5", name: "Adama", is_active: true },
  { id: "e255e097-b06e-4ef1-8062-6e15a9e6277b", name: "Bahir Dar", is_active: true },
  { id: "a1458100-80cc-4a56-9429-aab7f70e9a50", name: "Hawassa", is_active: true },
  { id: "f81e51d8-7ced-4071-9641-86ae4819d745", name: "Dire Dawa", is_active: true },
  { id: "289bfd52-080c-42db-be1c-7c1707f68ecd", name: "Gondar", is_active: true },
  { id: "eb5ab039-17bc-4db8-9649-00e933803915", name: "Mekelle", is_active: true },
  { id: "f0aa7da6-81d2-4360-bd3d-5e9c4cb80181", name: "Jimma", is_active: true },
  { id: "c29962b9-1a58-4eb3-9691-1026b6de2c7a", name: "Dessie", is_active: true },
  { id: "b33fa211-a40d-495a-9baa-6ae3478d3f24", name: "Harer", is_active: true },
  { id: "0a851986-4c3c-4bd1-a759-850cf9d3be1d", name: "jijga", is_active: true },
];

export const DEFAULT_JOBS: Job[] = [
  { id: "c506e752-04a6-43e3-83e3-7d385421d866", name: "Employee", description: "Regular employment", is_active: true },
  { id: "27eeda4d-fe69-453d-bf79-a7c4e1682802", name: "Self-employed", description: "Self employed or business owner", is_active: true },
];

export const ADDIS_ABABA_SUBCITIES: Subcity[] = [
  {
    "id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
    "name": "Addis Ketema",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
    "name": "Akaki Kality",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
    "name": "Arada",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "fda9703e-9274-4aae-9b65-03b0511beb82",
    "name": "Bole",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
    "name": "Gullele",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
    "name": "Kirkos",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "b67d236c-3638-4b32-8ced-da31734e65d9",
    "name": "Kolfe Keranio",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
    "name": "Lemi Kura",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
    "name": "Lideta",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "05defa56-d129-4f5f-848e-2192064bc45d",
    "name": "Nifas Silk-Lafto",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  },
  {
    "id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
    "name": "Yeka",
    "city_id": "627a11d6-d653-4eb0-b6b3-ba784b8afbd7",
    "is_active": true
  }
];

export const REAL_WOREDAS_BY_SUBCITY: Record<string, Woreda[]> = {
  "63e33710-c914-498d-b447-91fbe0f2d3a6": [
    {
      "id": "7e5a6ca7-0cca-41b3-9461-18efd1fc874a",
      "name": "Woreda 01",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "670d56fe-3dc5-4d53-b0ba-3e51e11c0e93",
      "name": "Woreda 02",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "ebbcd555-58a7-4ead-b996-89114c1b980c",
      "name": "Woreda 03",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "91708273-973b-428b-ad33-c0ff0bb91ecc",
      "name": "Woreda 04",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "a3d9abf1-ad0c-43c1-90ab-4a4e92234e74",
      "name": "Woreda 05",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "9ed2d633-3ad8-457d-a94f-1f30959cdd70",
      "name": "Woreda 06",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "ac183ada-f075-4ece-920a-fabfa8cb311f",
      "name": "Woreda 07",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "dd55ffef-b500-4296-b66c-d8da4d96810c",
      "name": "Woreda 08",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "0d8600cb-3ea5-4423-9896-e1b5d252f4f1",
      "name": "Woreda 09",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    },
    {
      "id": "35d5a2fb-0b37-4bd1-b9b3-d59d73df9538",
      "name": "Woreda 10",
      "subcity_id": "63e33710-c914-498d-b447-91fbe0f2d3a6",
      "is_active": true
    }
  ],
  "3d55290b-7329-428d-bd3e-97f8c2500fd3": [
    {
      "id": "2a371a77-2f35-440c-8e12-d979d9c96876",
      "name": "Woreda 01",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "4b287aa0-a505-4e72-b910-97653a53989e",
      "name": "Woreda 02",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "02099c0f-5fca-47f9-b23c-721b121b2892",
      "name": "Woreda 03",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "ba327ac1-1036-4e2a-bfa6-c44facec6a75",
      "name": "Woreda 04",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "14ab1e25-36ae-4092-80f0-cb3c1168cead",
      "name": "Woreda 05",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "c969bae2-dd80-4f12-b925-a1aa147b28fb",
      "name": "Woreda 06",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "8ddfad38-0e1c-434d-9295-89bef189bdaa",
      "name": "Woreda 07",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "082a22e4-8586-4d03-8433-19170f70baf8",
      "name": "Woreda 08",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "db8dda1f-64cf-450d-9071-b8aed0aa2155",
      "name": "Woreda 09",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "bc1e457a-6568-4d0e-860c-efe6244283b0",
      "name": "Woreda 10",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "1e4efbed-bbf1-4ad4-9312-3269fe69cb89",
      "name": "Woreda 11",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    },
    {
      "id": "d06a8414-5578-4b90-87f2-3920509209d4",
      "name": "Woreda 12",
      "subcity_id": "3d55290b-7329-428d-bd3e-97f8c2500fd3",
      "is_active": true
    }
  ],
  "ea47bd5c-68df-4c84-9c6c-d0e9621cba29": [
    {
      "id": "32107114-f460-4fa0-ba97-5ee38348ce1e",
      "name": "Woreda 01",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "7ecf7a46-e2d1-4449-a4cf-69be9d551b22",
      "name": "Woreda 02",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "fdf7dfc4-4dd0-4f69-a691-046d1c5b3414",
      "name": "Woreda 03",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "0e25c8b8-763e-48a7-9260-a988753ff905",
      "name": "Woreda 04",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "d7a89f61-00b5-4b20-8977-48e38cec4c8c",
      "name": "Woreda 05",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "aa34c816-c72f-45c2-ae6f-7779ad7906eb",
      "name": "Woreda 06",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "f04d3bb3-bfc5-4b05-b2ed-1cf28896fcb8",
      "name": "Woreda 07",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "ebca1a27-7764-435a-ba28-463bef9882ca",
      "name": "Woreda 08",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "34d87a8d-e4a7-4834-9c4d-b13359219aba",
      "name": "Woreda 09",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    },
    {
      "id": "837698d3-418a-4d40-a93a-4c36f657556d",
      "name": "Woreda 10",
      "subcity_id": "ea47bd5c-68df-4c84-9c6c-d0e9621cba29",
      "is_active": true
    }
  ],
  "dafb9f49-18ba-4a8c-8b42-28ec1fe4fc19": [
    {
      "id": "c075b58d-7d1e-47a2-b868-1b88f32c867b",
      "name": "01",
      "subcity_id": "dafb9f49-18ba-4a8c-8b42-28ec1fe4fc19",
      "is_active": true
    }
  ],
  "fda9703e-9274-4aae-9b65-03b0511beb82": [
    {
      "id": "35373b63-466d-4a01-bc3f-514ba53f3a1d",
      "name": "01",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "c27288e2-8931-487e-b9d4-e373663c0ca8",
      "name": "Woreda 01",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "89e84cd8-3955-4767-879b-17faea5901aa",
      "name": "Woreda 02",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "ae4fac1d-5ce1-4274-9af1-0a3a5e3c9c48",
      "name": "Woreda 03",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "756c23c0-cb63-468b-803b-4e918b76cbb9",
      "name": "Woreda 04",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "3f43ff77-765c-40a3-bb61-24888bbcf530",
      "name": "Woreda 05",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "343a37aa-52ce-466e-9d25-d7832457d83c",
      "name": "Woreda 06",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "f45d5818-bca3-4ed7-8b0a-8bce159d455e",
      "name": "Woreda 07",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "c0e180ce-d40b-4848-90ea-af63f611a1cd",
      "name": "Woreda 08",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "c633ab9b-24e0-4529-9da1-2c77c9b32e85",
      "name": "Woreda 09",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "940b0dd7-869b-48d8-9562-9f1bf8c9fc30",
      "name": "Woreda 10",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "080ee544-99d7-482b-8d22-287ae1d2f604",
      "name": "Woreda 11",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "bd468162-3e03-433c-ac09-a9ae8d64404d",
      "name": "Woreda 12",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "5b0fb3b8-d7c8-477e-8405-63b1a124322c",
      "name": "Woreda 13",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    },
    {
      "id": "3988306a-3d50-4c5a-9f11-61b361195758",
      "name": "Woreda 14",
      "subcity_id": "fda9703e-9274-4aae-9b65-03b0511beb82",
      "is_active": true
    }
  ],
  "775d39d5-f3dc-43e7-a500-b0cba3951a50": [
    {
      "id": "c4f1f1c6-d0f6-4d51-bb87-77a2d26c35fd",
      "name": "Woreda 01",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "403e8181-3c44-4f9d-8107-4193cd7a402b",
      "name": "Woreda 02",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "68e3b710-ead1-4a2f-a3aa-30b9b066d775",
      "name": "Woreda 03",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "16b766c2-9347-423b-bcd4-d986979cb5cc",
      "name": "Woreda 04",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "db4c5885-c53e-4975-94a3-4bbe0be580cd",
      "name": "Woreda 05",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "4c1d90fb-9966-4e55-bab7-0ae5e3108af4",
      "name": "Woreda 06",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "e04dbd37-a659-4aca-bc93-7fbb02ecb7f2",
      "name": "Woreda 07",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "bbf3ecf1-9bae-4577-9b1a-af131ca961c9",
      "name": "Woreda 08",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "0ebc222f-7b9d-4d57-bd1c-8d3d83e94fef",
      "name": "Woreda 09",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    },
    {
      "id": "5fa2c21f-9388-4733-a265-e570b836f801",
      "name": "Woreda 10",
      "subcity_id": "775d39d5-f3dc-43e7-a500-b0cba3951a50",
      "is_active": true
    }
  ],
  "300f13ef-f721-4adf-8ae3-918d02ad4305": [
    {
      "id": "0756f4a1-6647-4112-9c41-baca29e40ee8",
      "name": "Woreda 01",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "023d3293-67f1-4231-854b-52e7c4f6fdb4",
      "name": "Woreda 02",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "ff1702f4-71fa-4e5d-af0d-2bda9f817a96",
      "name": "Woreda 03",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "edb4f62a-0a8f-4b2b-b0ae-d06222e06478",
      "name": "Woreda 04",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "65eb8732-168b-435c-bf06-84f3683fa0a3",
      "name": "Woreda 05",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "fe7f2fa3-3231-4179-92b1-9102ebcc0183",
      "name": "Woreda 06",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "32a562a0-5f44-4441-8dc3-c7be36965cfd",
      "name": "Woreda 07",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "41792525-fbc3-4e92-849f-91ad8ffc053f",
      "name": "Woreda 08",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "53ec3433-18a5-4ceb-adcb-bbf4bc57b6d7",
      "name": "Woreda 09",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "cd01bf13-a529-4669-ac6d-b3eb2c68b443",
      "name": "Woreda 10",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    },
    {
      "id": "bd3ed895-641b-4b6a-9534-eb5c308ce463",
      "name": "Woreda 11",
      "subcity_id": "300f13ef-f721-4adf-8ae3-918d02ad4305",
      "is_active": true
    }
  ],
  "b67d236c-3638-4b32-8ced-da31734e65d9": [
    {
      "id": "e865128e-1ae4-483a-8ad4-539c63c2a92b",
      "name": "Woreda 01",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "f646c3aa-1ea3-4731-afe8-e77f4bf71fbc",
      "name": "Woreda 02",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "7b8d5b14-1955-4976-85b5-feba248924c2",
      "name": "Woreda 03",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "42de1e06-b2f4-4951-949c-4f6fc94cf4a1",
      "name": "Woreda 04",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "1cf79858-82a7-406b-9625-44db3be2471d",
      "name": "Woreda 05",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "be5864f1-26fe-465e-9125-8d45aa8cef1e",
      "name": "Woreda 06",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "9c5c9ff4-d956-4263-9080-cebd52fc28c1",
      "name": "Woreda 07",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "85b66f18-7770-41b3-bb1d-4074c1781a58",
      "name": "Woreda 08",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "3a2f9492-b63f-4b69-91c5-9fe9bba23fd0",
      "name": "Woreda 09",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "a4e58215-d255-4438-ab6b-c69767f93a64",
      "name": "Woreda 10",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "5a91c913-3065-4221-88f5-a0b7ce11f2c9",
      "name": "Woreda 11",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "3e9c6d35-6962-4393-a5b3-b360a8255b7d",
      "name": "Woreda 12",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "4801d492-6954-4747-a18d-0496d71e6650",
      "name": "Woreda 13",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "910cf8ae-5799-4363-8ad0-56a47041c798",
      "name": "Woreda 14",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    },
    {
      "id": "531e8e81-9b53-49d2-9ffc-68ef4d9ea288",
      "name": "Woreda 15",
      "subcity_id": "b67d236c-3638-4b32-8ced-da31734e65d9",
      "is_active": true
    }
  ],
  "718c321c-63f0-4ebe-ab99-1c66f26165df": [
    {
      "id": "31e19e65-b0f2-478b-9ecb-814bcb48b613",
      "name": "Woreda 01",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "91258d16-a79f-421a-8735-5f4d238e7486",
      "name": "Woreda 02",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "7116c17d-f090-461b-9975-113398632fb0",
      "name": "Woreda 03",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "2b9a132a-05be-4af1-9959-1ed5ea64afed",
      "name": "Woreda 04",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "d818b76f-bf89-4fbb-a7a0-76a60382bb14",
      "name": "Woreda 05",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "c9076ea9-5f9c-48b3-846a-058959692168",
      "name": "Woreda 06",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "d47a23da-eedc-4a20-822b-b8cf76a3e606",
      "name": "Woreda 07",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "fa0ea706-53d0-4542-b7e0-0bd304a22e95",
      "name": "Woreda 08",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "771e3776-a5c5-4d86-9b7e-88a171b7caf1",
      "name": "Woreda 09",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    },
    {
      "id": "5af711ca-ee10-4faf-82a8-7a7b36f020dc",
      "name": "Woreda 10",
      "subcity_id": "718c321c-63f0-4ebe-ab99-1c66f26165df",
      "is_active": true
    }
  ],
  "3bb73ec7-a15f-4f24-94e5-c670cbb368dd": [
    {
      "id": "13452375-b999-4a31-a223-064ff9ba757b",
      "name": "Woreda 01",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "d00e1382-7340-43f3-9d1b-106b7833dfcc",
      "name": "Woreda 02",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "527366f3-878e-48fc-8835-4863fde785d4",
      "name": "Woreda 03",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "58df66e1-0ec9-43f8-a965-665de91e0b15",
      "name": "Woreda 04",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "e8025940-4009-40aa-a963-3d8a891b9a2e",
      "name": "Woreda 05",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "aabf529a-3da9-4487-b1e0-c19d387040e0",
      "name": "Woreda 06",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "c9b7fe42-f48e-4123-a6e0-13650b8d2dc7",
      "name": "Woreda 07",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "6dfa0588-1bcb-48b8-92d1-2160c8c56b9b",
      "name": "Woreda 08",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "f778a70f-5093-4613-b886-8519031afa5a",
      "name": "Woreda 09",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    },
    {
      "id": "c367697e-36de-4b45-8085-4c72e2690fb9",
      "name": "Woreda 10",
      "subcity_id": "3bb73ec7-a15f-4f24-94e5-c670cbb368dd",
      "is_active": true
    }
  ],
  "05defa56-d129-4f5f-848e-2192064bc45d": [
    {
      "id": "5535b03e-0122-4057-87de-2079bdcc619f",
      "name": "Woreda 01",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "8fc5f45f-0772-4e0f-8c1e-aeccdcea6aa3",
      "name": "Woreda 02",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "642ee69e-154a-4361-96f7-60b8c74ad2a1",
      "name": "Woreda 03",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "653fdff2-204b-432c-9e8f-841054369671",
      "name": "Woreda 04",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "acbdb13a-eff6-4d68-be89-c226a8899050",
      "name": "Woreda 05",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "eebcd4fb-4788-4dda-b8ed-3726fbbeb5e1",
      "name": "Woreda 06",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "1743bd0a-faf9-41ac-9dda-2375a00e0d26",
      "name": "Woreda 07",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "e7dcbed2-3887-43f1-86a6-ea6e8b4853ca",
      "name": "Woreda 08",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "de3d404a-49b6-4eb7-9429-0d1d239cdc4e",
      "name": "Woreda 09",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "ec11a027-ee30-4228-9c6e-2a055b5e3a94",
      "name": "Woreda 10",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "5cfff40d-6611-4331-b7aa-3abaa3fc188e",
      "name": "Woreda 11",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "34553630-44dc-4d17-accc-2b18c27be28d",
      "name": "Woreda 12",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "309c392c-6604-4a56-baa9-2eb4bc616ec0",
      "name": "Woreda 13",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "d8248c86-72e3-43b3-a378-d9078960f4e2",
      "name": "Woreda 14",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    },
    {
      "id": "62615c21-0c5f-4dad-b235-05d9a65b8f0e",
      "name": "Woreda 15",
      "subcity_id": "05defa56-d129-4f5f-848e-2192064bc45d",
      "is_active": true
    }
  ],
  "35d89234-b13b-4ad2-a4bc-90ccb9073c07": [
    {
      "id": "e5b03ad6-9676-48f1-8fb0-96d090fb110f",
      "name": "Woreda 01",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "0045f62a-cebf-4ccf-bc59-a96747dd2c2a",
      "name": "Woreda 02",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "4dcae4ef-4ca0-4574-8a13-871a9e458774",
      "name": "Woreda 03",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "250943cd-9826-4935-a1bc-8db63f292573",
      "name": "Woreda 04",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "47eb2c1d-fde3-4c16-88da-4c1eee7f2dc2",
      "name": "Woreda 05",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "2ae228bb-70bc-4169-b751-a5f65bd74455",
      "name": "Woreda 06",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "7513b8af-2f78-442c-a63c-862f08a45ab2",
      "name": "Woreda 07",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "0b8737fd-37c8-431f-b4d9-2e9f6b4cc630",
      "name": "Woreda 08",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "169a2935-82db-4359-b45c-ac10b247545b",
      "name": "Woreda 09",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "01911a87-6b91-40be-b8c3-c02328477a48",
      "name": "Woreda 10",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "65bc0b26-e7da-4e11-a8c5-be9c5e4d4753",
      "name": "Woreda 11",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "1dec075f-d865-4e79-b6d4-2701e62a31fb",
      "name": "Woreda 12",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    },
    {
      "id": "74189672-b75a-443b-8efc-9287fb8f727b",
      "name": "Woreda 13",
      "subcity_id": "35d89234-b13b-4ad2-a4bc-90ccb9073c07",
      "is_active": true
    }
  ]
};

export function getDefaultWoredasForSubcity(subcityId: string): Woreda[] {
  if (REAL_WOREDAS_BY_SUBCITY[subcityId] && REAL_WOREDAS_BY_SUBCITY[subcityId].length > 0) {
    return REAL_WOREDAS_BY_SUBCITY[subcityId];
  }
  return [];
}
