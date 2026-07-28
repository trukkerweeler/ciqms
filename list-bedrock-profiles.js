const {
  BedrockClient,
  ListInferenceProfilesCommand,
} = require("@aws-sdk/client-bedrock");

async function main() {
  const client = new BedrockClient({
    region: process.env.AWS_REGION || "us-west-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const response = await client.send(
    new ListInferenceProfilesCommand({
      typeEquals: "SYSTEM_DEFINED",
      maxResults: 200,
    }),
  );

  const profiles = response.inferenceProfileSummaries || [];
  const novaProfiles = profiles.filter((profile) => {
    const serialized = JSON.stringify(profile).toLowerCase();
    return serialized.includes("nova-pro") || serialized.includes("nova");
  });

  console.log(JSON.stringify(novaProfiles, null, 2));
}

main().catch((error) => {
  console.error("Failed to list inference profiles:", error.message);
  process.exit(1);
});
