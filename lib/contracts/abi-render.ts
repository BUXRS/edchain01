// Render Contract ABI
// Contract Address: 0xC28ed1b3DD8AE49e7FC94cB15891524848f6ef42
// Purpose: Rendering operations (tokenURI generation)

export const RENDER_CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "universityNameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "universityNameEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "facultyAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "facultyEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "majorAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "majorEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "degreeNameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "degreeNameEn",
				"type": "string"
			},
			{
				"internalType": "uint16",
				"name": "gpaTimes100",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "year",
				"type": "uint16"
			},
			{
				"internalType": "bool",
				"name": "isRevoked",
				"type": "bool"
			},
			{
				"internalType": "uint40",
				"name": "issuedTimestamp",
				"type": "uint40"
			},
			{
				"internalType": "uint40",
				"name": "revokedTimestamp",
				"type": "uint40"
			}
		],
		"name": "render",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	}
] as const
