// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// import React from 'react';
// import { styled } from '@mui/material/styles';
// import { Typography } from '@mui/material';

// const CustomFormLabel = styled((props: any) => (
//   <Typography
//     variant="subtitle1"
//     fontWeight={600}
//     {...props}
//     component="label"
//     htmlFor={props.htmlFor}
//   />
// ))(() => ({
//   marginBottom: '5px',
//   marginTop: '25px',
//   display: 'block',
// }));

// export default CustomFormLabel;


// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { styled } from '@mui/material/styles';
import { Typography } from '@mui/material';

// The new component now accepts a 'required' prop.
const CustomFormLabel = styled((props: any) => {
  // Extract the 'required' prop to use it in the component.
  const { required, children, ...other } = props;
  return (
    <Typography
      variant="subtitle1"
      fontWeight={600}
      {...other}
      component="label"
      htmlFor={props.htmlFor}
    >
      {children}
      {/* Conditionally render the red star based on the 'required' prop */}
      {required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
    </Typography>
  );
})(() => ({
  marginBottom: '5px',
  marginTop: '25px',
  display: 'block',
}));

export default CustomFormLabel;