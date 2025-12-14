// In the excavate route, after creating the job, add:

await redisStore.addEvent({
  type: 'excavation_started',
  repoUrl,
  commitHash: 'latest',
  message: `Started analyzing ${repoUrl}`,
  timestamp: new Date()
});

