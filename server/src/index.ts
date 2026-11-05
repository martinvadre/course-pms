import app from './app';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`CoursePMS API Server running on http://localhost:${PORT}`);
});
