import { Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, action }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          {title}
        </Typography>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs>
            {breadcrumbs.map((item, index) =>
              item.to ? (
                <Link
                  key={`${item.label}-${index}`}
                  component={RouterLink}
                  to={item.to}
                  underline="hover"
                  color="inherit"
                >
                  {item.label}
                </Link>
              ) : (
                <Typography key={`${item.label}-${index}`} color="text.primary">
                  {item.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
      </Stack>
      {action}
    </Stack>
  );
}
