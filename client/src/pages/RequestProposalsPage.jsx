import { Breadcrumbs, Link } from '@mui/material';

const RequestProposalsPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          component={RouterLink} 
          to="/officer-dashboard"
          underline="hover"
        >
          Procurement Dashboard
        </Link>
        <Typography color="text.primary">
          {request?.title} - Proposals
        </Typography>
      </Breadcrumbs>

      {/* Rest of the proposals view */}
    </Container>
  );
}; 