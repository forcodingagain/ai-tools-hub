import { FloatButton } from 'antd';
import ThemeSwitch from '../Common/ThemeSwitch';

const FloatToolbar = () => {
  return (
    <>
      <FloatButton.BackTop />
      <ThemeSwitch type="float" />
    </>
  );
};

export default FloatToolbar;
